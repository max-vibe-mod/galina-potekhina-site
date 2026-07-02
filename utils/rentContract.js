const fs = require('fs');
const path = require('path');
const { formatMoney, amountInWords } = require('./rentPricing');

const CONTRACTS_DIR = path.join(__dirname, '..', 'data', 'contracts');

function escapeHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatDateRu(iso) {
  if (!iso) return '________';
  const part = String(iso).slice(0, 10);
  const [y, m, d] = part.split('-');
  if (!y || !m || !d) return '________';
  return `${d}.${m}.${y}`;
}

function rub(amount) {
  const n = Math.round(Number(amount) || 0);
  return `${n.toLocaleString('ru-RU')} рос. рублей (${amountInWords(n)})`;
}

function objectDescription(item) {
  const parts = [item.title];
  if (item.description) parts.push(item.description);
  return parts.join(', ');
}

function buildContractHtml(booking, item, settings) {
  const landlordName = settings.self_employed_name || 'Потёхина Галина Викторовна';
  const landlordInn = settings.self_employed_inn || '________';
  const landlordOgrnip = settings.landlord_ogrnip || '________';
  const landlordAddress = settings.landlord_address || 'г. Владивосток';
  const landlordPassport = settings.landlord_passport || '________';
  const landlordPhone = settings.phone || '________';
  const landlordEmail = settings.self_employed_email || settings.admin_notify_email || '________';

  const tenantName = booking.customer_name;
  const tenantInn = booking.tenant_inn || '________';
  const tenantPassport = booking.passport || '________';
  const tenantAddress = booking.tenant_address || '________';
  const tenantPhone = booking.phone;
  const tenantEmail = booking.email || '________';

  const contractDate = formatDateRu(booking.created_at?.slice(0, 10) || new Date().toISOString().slice(0, 10));
  const dressValue = booking.dress_value || item.price || 0;
  const deposit = booking.deposit_amount || 0;
  const rent = booking.amount || 0;
  const purpose = booking.rental_purpose || 'удовлетворение частных (личных) потребностей Арендатора';
  const payment = booking.payment_method || 'по согласованию с Арендодателем';
  const periodEnd = formatDateRu(booking.rent_to);
  const transferDate = formatDateRu(booking.rent_from);
  const rentCalcNote = booking.rent_breakdown
    ? `${booking.rent_breakdown}, тариф: ${booking.period_type === 'week' ? 'по неделям' : 'по дням'}`
    : `с ${formatDateRu(booking.rent_from)} по ${formatDateRu(booking.rent_to)}`;

  const dayRate = item.rent_price_day || Math.round((booking.amount || 0) / Math.max(1, booking.rent_days || 1));
  const scheduleNote = booking.comment
    ? `Ориентировочное время: ${escapeHtml(booking.comment)}.`
    : 'Время передачи и возврата согласуется дополнительно при подтверждении заявки.';

  const body = `
  <h1>ДОГОВОР ПРОКАТА</h1>
  <p class="meta">№ ${booking.id} · Дата: ${contractDate}</p>

  <p><strong>${escapeHtml(landlordName.toUpperCase())}</strong>, гражданин(ка) Российской Федерации, ИНН: ${escapeHtml(landlordInn)}, номер регистрации физического лица индивидуальным предпринимателем: ${escapeHtml(landlordOgrnip)}, адрес места регистрации (места постоянного проживания): ${escapeHtml(landlordAddress)}, паспорт (документ, удостоверяющий личность): ${escapeHtml(landlordPassport)} (далее «Арендодатель»), с одной стороны, и</p>
  <p><strong>${escapeHtml(tenantName)}</strong>, гражданин(ка) Российской Федерации, ИНН: ${escapeHtml(tenantInn)}, паспорт (документ, удостоверяющий личность): ${escapeHtml(tenantPassport)}, который(ая) проживает по адресу: ${escapeHtml(tenantAddress)} (далее «Арендатор»), с другой стороны,</p>
  <p>далее Арендодатель и Арендатор совместно именуются «Стороны», а каждый отдельно — «Сторона», заключили настоящий Договор проката от ${contractDate} (далее «Договор») о нижеследующем:</p>

  <p class="section-title">1. Определение понятий</p>
  <p>«Прокат» означает временное срочное платное пользование Арендатором Объектом, полученным от Арендодателя, для удовлетворения частных (не коммерческих) потребностей Арендатора.</p>
  <p>«Повреждение» означает нанесение вреда Объекту, следствием чего стало нарушение и/или потеря таким Объектом определённых свойств и возможностей, а восстановление таких свойств и возможностей допускается лишь при условии проведения соответствующего ремонта.</p>
  <p>«Объект» означает движимое имущество, определённое индивидуальными признаками, передаваемое в Прокат. Для целей настоящего Договора в Прокат передаётся: <strong>${escapeHtml(objectDescription(item))}</strong>.</p>
  <p>«Оценочная стоимость» означает рыночную стоимость Объекта, переданного в Прокат, которая подлежит выплате Арендатором полностью или частично в случае утраты или существенного повреждения Объекта.</p>
  <p>«Утрата» означает безвозвратную потерю Объекта и/или его повреждение, не позволяющее в дальнейшем использовать Объект по назначению.</p>
  <p>«Цель проката»: ${escapeHtml(purpose)}.</p>

  <p class="section-title">2. Предмет договора</p>
  <p><strong>2.1.1.</strong> Арендодатель передаёт, а Арендатор принимает в Прокат указанный Объект. Оценочная стоимость составляет <strong>${rub(dressValue)}</strong>.</p>
  <p><strong>2.1.2.</strong> Объект передаётся в отличном состоянии. При получении Арендатор обязан осмотреть платье и в акте приёма-передачи зафиксировать замечания либо подтвердить отсутствие претензий. Замечания, не заявленные при получении, не принимаются, за исключением скрытых недостатков, которые не могли быть обнаружены при обычном осмотре.</p>
  <p><strong>2.1.3.</strong> Передача и возврат Объекта оформляются актом приёма-передачи с описанием состояния, комплектации и фотофиксацией (по усмотрению Арендодателя).</p>
  <p><strong>2.2.1.</strong> Передача Объекта: <strong>${transferDate}</strong>. Срок проката: с ${formatDateRu(booking.rent_from)} по ${periodEnd} (${escapeHtml(rentCalcNote)}). ${scheduleNote}</p>
  <p><strong>2.3.1.</strong> При обнаружении недостатков, препятствующих пользованию (не по вине Арендатора), Арендодатель устраняет их в течение 7 (семи) календарных дней либо производит замену аналогичным имуществом.</p>
  <p><strong>2.3.2.</strong> Недостатки, возникшие по вине Арендатора (нарушение правил эксплуатации, загрязнение, порча), устраняются за счёт Арендатора по фактической стоимости ремонта и/или профессиональной чистки.</p>
  <p><strong>2.4.1.</strong> При Утрате или Повреждении Арендатор незамедлительно (не позднее 2 календарных дней) уведомляет Арендодателя.</p>
  <p><strong>2.4.3.</strong> При Утрате или существенном Повреждении Арендатор возмещает ущерб в пределах <strong>${rub(dressValue)}</strong> либо по выбору Арендодателя: (1) компенсирует документально подтверждённую стоимость восстановления/замены; (2) предоставляет аналогичный Объект; (3) уплачивает согласованную неустойку. Задаток <strong>${rub(deposit)}</strong> (15% от оценочной стоимости) удерживается при нарушении сохранности и зачитывается в счёт ущерба; при недостаточности Задатка взыскивается разница.</p>
  <p><strong>2.5. Риск случайной гибели.</strong> Риск случайной гибели или случайного повреждения Объекта переходит к Арендатору с момента фактической передачи по акту приёма-передачи (ст. 691 ГК РФ).</p>

  <p class="section-title">3. Срок договора</p>
  <p><strong>3.1.</strong> Договор действует с даты подписания Сторонами до <strong>${periodEnd}</strong> включительно (дата возврата).</p>
  <p><strong>3.2.</strong> Просрочка возврата: за каждый календарный день просрочки Арендатор уплачивает плату в размере суточной ставки Ренты — <strong>${rub(dayRate)}</strong> за сутки, если иное не согласовано письменно.</p>
  <p><strong>3.3.</strong> Продление срока допускается только по письменному согласованию Арендодателя и при дополнительной оплате Ренты.</p>

  <p class="section-title">4. Заверения и гарантии</p>
  <p>Стороны подтверждают дееспособность и осознанное заключение Договора. Арендатор подтверждает, что Объект предоставляется для личных (не коммерческих) целей: ${escapeHtml(purpose)}. Коммерческое использование (съёмка на продажу услуг третьим лицам, субаренда) — только с письменного согласия Арендодателя.</p>

  <p class="section-title">5. Права и обязанности сторон</p>
  <p><strong>5.1. Арендатор обязан:</strong></p>
  <p>— бережно использовать Объект только по назначению; не передавать третьим лицам;</p>
  <p>— не производить подшив, ремонт, химчистку, стирку самостоятельно без согласия Арендодателя;</p>
  <p>— не допускать курения, контакта с едой, напитками, масляными/красящими веществами, острыми предметами, домашними животными;</p>
  <p>— вернуть Объект в согласованный срок в состоянии не хуже получения с учётом нормального износа от кратковременного ношения;</p>
  <p>— своевременно оплатить Ренту, Задаток и иные платежи по Договору.</p>
  <p><strong>5.2. Арендодатель вправе:</strong> отказать в выдаче при непредоставлении документов; удержать Задаток при нарушениях; расторгнуть Договор при существенном нарушении (передача третьим лицам, грубая порча, просрочка более 1 суток); осмотреть Объект при возврате и зафиксировать состояние.</p>
  <p><strong>5.3.</strong> При возврате с загрязнениями, требующими профессиональной чистки сверх нормального износа, Арендатор возмещает фактические расходы на чистку/реставрацию, в том числе из Задатка.</p>

  <p class="section-title">6. Рента и взаиморасчёты</p>
  <div class="highlight">
    <p><strong>6.1.</strong> Рента за период: <strong>${rub(rent)}</strong>. Расчёт: ${escapeHtml(rentCalcNote)}.</p>
    <p><strong>6.2.</strong> Задаток: <strong>${rub(deposit)}</strong> (15% от оценочной стоимости). Возвращается в течение 10 (десяти) рабочих дней после возврата Объекта и осмотра, при отсутствии претензий к состоянию и задолженности по Ренте/неустойкам.</p>
    <p><strong>6.3.</strong> Способ оплаты: ${escapeHtml(payment)}. Итого при выдаче: <strong>${formatMoney(rent + deposit)}</strong> (Рента + Задаток).</p>
    <p><strong>6.4.</strong> Размер Ренты изменяется только по письменному соглашению Сторон. При досрочном отказе Арендатора менее чем за 3 календарных дня до даты получения уплаченная Рента возврату не подлежит, если Арендодатель не сможет повторно сдать Объект в прокат на тот же период.</p>
  </div>

  <p class="section-title">7. Расторжение и возврат</p>
  <p>Расторжение — по соглашению Сторон или в порядке ст. 450–452 ГК РФ. При возврате в надлежащем состоянии Задаток возвращается согласно п. 6.2. Арендатор обязан вернуть Объект лично или согласованным способом в часы работы студии.</p>

  <p class="section-title">8. Форс-мажор</p>
  <p>Стороны освобождаются от ответственности при обстоятельствах непреодолимой силы при уведомлении другой Стороны в разумный срок.</p>

  <p class="section-title">9. Коммуникация и претензии</p>
  <p>Арендодатель: e-mail ${escapeHtml(landlordEmail)}, тел. ${escapeHtml(landlordPhone)}.</p>
  <p>Арендатор: e-mail ${escapeHtml(tenantEmail)}, тел. ${escapeHtml(tenantPhone)}.</p>
  <p>Споры разрешаются в претензионном порядке (срок ответа на претензию — 10 календарных дней), затем в суде по месту жительства/нахождения ответчика в соответствии с законодательством РФ.</p>

  <p class="section-title">10. Заключительные положения</p>
  <p>К Договору применяется право Российской Федерации, в том числе Закон РФ «О защите прав потребителей» (в части, не противоречащей характеру договора проката). Условия, ущемляющие права потребителя по сравнению с законом, являются ничтожными. Настоящий проект Договора сформирован по заявке №${booking.id} на сайте студии Galina Potekhina и подлежит подписанию Сторонами при выдаче платья.</p>
  <p>Арендатор подтверждает достоверность указанных данных и согласие на обработку персональных данных в объёме, необходимом для исполнения Договора.</p>
  `;

  return `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <title>Договор проката №${booking.id} — ${escapeHtml(item.title)}</title>
  <style>
    body { font-family: 'Times New Roman', Georgia, serif; font-size: 12pt; line-height: 1.55; color: #111; max-width: 800px; margin: 0 auto; padding: 32px 40px; }
    .banner { background: #fff3cd; border: 2px solid #b8975a; padding: 14px 18px; margin-bottom: 28px; font-size: 11pt; text-align: center; font-weight: bold; line-height: 1.5; }
    h1 { text-align: center; font-size: 16pt; letter-spacing: 0.08em; margin-bottom: 8px; }
    .meta { text-align: center; margin-bottom: 24px; color: #444; }
    p { margin: 0 0 10px; text-align: justify; }
    .section-title { font-weight: bold; margin: 18px 0 8px; text-transform: uppercase; font-size: 11pt; }
    .signatures { margin-top: 48px; display: grid; grid-template-columns: 1fr 1fr; gap: 40px; }
    .sign-block { border-top: 1px solid #333; padding-top: 8px; min-height: 80px; }
    .sign-note { font-size: 10pt; color: #666; margin-top: 6px; }
    .highlight { background: #faf7f1; padding: 12px 14px; border-left: 3px solid #b8975a; margin: 12px 0; }
    .footer-note { margin-top: 24px; font-size: 10pt; color: #666; }
    @media print { .banner { break-inside: avoid; } body { padding: 20px; } .no-print { display: none; } }
  </style>
</head>
<body>
  <div class="banner">
    ПРОЕКТ ДОГОВОРА — НЕ ЯВЛЯЕТСЯ ДЕЙСТВУЮЩИМ без личной подписи Арендодателя (${escapeHtml(landlordName)}) при выдаче платья.
    Подпись проставляется вручную в студии.
  </div>
  <p class="no-print" style="text-align:center"><button onclick="window.print()">Сохранить / Печать PDF</button></p>
  ${body}
  <div class="signatures">
    <div>
      <div class="sign-block">_________________________</div>
      <p><strong>Арендодатель</strong><br>${escapeHtml(landlordName)}</p>
      <p class="sign-note">Подпись проставляется лично при выдаче платья. Без этой подписи договор недействителен.</p>
    </div>
    <div>
      <div class="sign-block">_________________________</div>
      <p><strong>Арендатор</strong><br>${escapeHtml(tenantName)}</p>
      <p class="sign-note">Подпись при получении платья</p>
    </div>
  </div>
</body>
</html>`;
}

function saveContract(booking, item, settings) {
  if (!fs.existsSync(CONTRACTS_DIR)) {
    fs.mkdirSync(CONTRACTS_DIR, { recursive: true });
  }
  const filename = `booking-${booking.id}.html`;
  const filePath = path.join(CONTRACTS_DIR, filename);
  fs.writeFileSync(filePath, buildContractHtml(booking, item, settings), 'utf8');
  return filename;
}

function getContractPath(bookingId) {
  return path.join(CONTRACTS_DIR, `booking-${bookingId}.html`);
}

module.exports = { buildContractHtml, saveContract, getContractPath, CONTRACTS_DIR };
