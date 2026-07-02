const STATUS_STEPS = [
  { key: 'new', label: 'Принят', progress: 15, desc: 'Заказ принят в работу' },
  { key: 'processing', label: 'Пошив', progress: 40, desc: 'Идёт пошив изделия' },
  { key: 'paid', label: 'Примерка', progress: 65, desc: 'Примерка и корректировка' },
  { key: 'shipped', label: 'Финализация', progress: 85, desc: 'Финальная обработка' },
  { key: 'done', label: 'Готово', progress: 100, desc: 'Заказ готов к выдаче' }
];

const STATUS_LABELS = {
  new: 'Принят',
  processing: 'В работе',
  paid: 'Примерка',
  shipped: 'Финализация',
  done: 'Готово',
  cancelled: 'Отменён'
};

function getOrderProgress(status) {
  if (status === 'cancelled') return { progress: 0, label: 'Отменён', step: -1, desc: 'Заказ отменён' };
  const idx = STATUS_STEPS.findIndex(s => s.key === status);
  if (idx === -1) return { progress: 10, label: STATUS_LABELS[status] || status, step: 0, desc: '' };
  return {
    progress: STATUS_STEPS[idx].progress,
    label: STATUS_STEPS[idx].label,
    step: idx,
    desc: STATUS_STEPS[idx].desc
  };
}

function canClientCancel(status) {
  return status === 'new' || status === 'processing';
}

function isActiveOrder(status) {
  return status !== 'done' && status !== 'cancelled';
}

module.exports = { STATUS_STEPS, STATUS_LABELS, getOrderProgress, isActiveOrder, canClientCancel };
