/**
 * Inscrições do Treinamento de Natal → Google Planilhas (+ aviso por e-mail).
 *
 * Como instalar:
 *  1. Crie uma planilha em branco (sheets.new) com a conta Google da oficina.
 *  2. Menu Extensões → Apps Script. Apague o que estiver lá e cole este código.
 *  3. Troque o TOKEN abaixo pelo token combinado (o mesmo de SHEETS_TOKEN no Vercel).
 *  4. Implantar → Nova implantação → tipo "App da Web".
 *     Executar como: Eu  ·  Quem pode acessar: Qualquer pessoa  → Implantar.
 *     Autorize o acesso (se aparecer "app não verificado": Avançado → Acessar).
 *  5. Copie a URL que termina em /exec (vai em SHEETS_WEBHOOK_URL no Vercel).
 */
const TOKEN = 'COLE_O_TOKEN_AQUI';
const AVISAR_POR_EMAIL = true; // manda um e-mail para o dono da planilha a cada inscrição

const CABECALHO = ['Data', 'Nome', 'WhatsApp', 'CPF', 'E-mail', 'Cidade', 'Experiência', 'Pagamento', 'Valor', 'Pago?'];

function doPost(e) {
  let dados;
  try {
    dados = JSON.parse(e.postData.contents);
  } catch (err) {
    return resposta({ ok: false, error: 'json' });
  }
  if (dados.token !== TOKEN) return resposta({ ok: false, error: 'token' });

  // Evita que alguém escreva fórmulas na planilha pelo formulário.
  const limpo = (v) => {
    const t = String(v == null ? '' : v).slice(0, 200);
    return /^[=+\-@]/.test(t) ? "'" + t : t;
  };

  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  let total;
  try {
    const aba = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
    if (aba.getLastRow() === 0) {
      aba.appendRow(CABECALHO);
      aba.setFrozenRows(1);
      aba.getRange(1, 1, 1, CABECALHO.length).setFontWeight('bold').setBackground('#FFC61A');
    }
    aba.appendRow([
      new Date(),
      limpo(dados.nome),
      limpo(dados.whatsapp),
      limpo(dados.cpf),
      limpo(dados.email),
      limpo(dados.cidade),
      limpo(dados.experiencia),
      limpo(dados.pagamento),
      Number(dados.valor) || '',
      false,
    ]);
    const linha = aba.getLastRow();
    aba.getRange(linha, 1).setNumberFormat('dd/MM/yyyy HH:mm');
    aba.getRange(linha, 9).setNumberFormat('"R$" #,##0.00');
    aba.getRange(linha, 10).insertCheckboxes();
    total = linha - 1;
  } finally {
    lock.releaseLock();
  }

  if (AVISAR_POR_EMAIL) {
    const zap = 'https://wa.me/55' + String(dados.whatsapp || '').replace(/\D/g, '');
    const corpo = [
      'Nova inscrição no Treinamento de Natal',
      '',
      'Nome: ' + dados.nome,
      'WhatsApp: ' + dados.whatsapp + ' (' + zap + ')',
      dados.cpf ? 'CPF: ' + dados.cpf : null,
      dados.email ? 'E-mail: ' + dados.email : null,
      dados.cidade ? 'Cidade: ' + dados.cidade : null,
      dados.experiencia ? 'Experiência: ' + dados.experiencia : null,
      'Pagamento: ' + dados.pagamento + ' (R$ ' + Number(dados.valor).toFixed(2).replace('.', ',') + ')',
      '',
      'Total de inscritos: ' + total,
      'Planilha: ' + SpreadsheetApp.getActiveSpreadsheet().getUrl(),
    ].filter((l) => l !== null).join('\n');
    MailApp.sendEmail(Session.getEffectiveUser().getEmail(), '🎄 Nova inscrição: ' + dados.nome, corpo);
  }

  return resposta({ ok: true, total: total });
}

function resposta(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
