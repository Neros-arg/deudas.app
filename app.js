const STORAGE_KEY = "misServicios_v1";


// ==========================================
// VARIABLES
// ==========================================

let data = [];
let currentDate = new Date();

let selectedServiceId = null;


// ==========================================
// ELEMENTOS
// ==========================================

const monthLabel = document.getElementById("monthLabel");

const serviceList = document.getElementById("serviceList");

const pendingCount = document.getElementById("pendingCount");
const paidCount = document.getElementById("paidCount");
const overdueCount = document.getElementById("overdueCount");
const totalPending = document.getElementById("totalPending");

const formBackdrop = document.getElementById("formBackdrop");
const detailBackdrop = document.getElementById("detailBackdrop");
const historyBackdrop = document.getElementById("historyBackdrop");

const serviceForm = document.getElementById("serviceForm");

const toast = document.getElementById("toast");


// ==========================================
// CARGAR DATOS
// ==========================================

function loadData() {

  try {

    const saved = localStorage.getItem(STORAGE_KEY);

    data = saved ? JSON.parse(saved) : [];

  } catch (error) {

    console.error(error);

    data = [];

  }


  // Compatibilidad con versiones anteriores

  data = data.map(service => {

    if (!Array.isArray(service.payments)) {
      service.payments = [];
    }

    if (!Array.isArray(service.paidMonths)) {
      service.paidMonths = [];
    }

    return service;

  });

}


// ==========================================
// GUARDAR
// ==========================================

function saveData() {

  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(data)
  );

}


// ==========================================
// FECHAS
// ==========================================

function parseDate(value) {

  if (!value) {
    return new Date();
  }

  const parts = value.split("-");

  if (parts.length === 3) {

    return new Date(
      Number(parts[0]),
      Number(parts[1]) - 1,
      Number(parts[2])
    );

  }

  return new Date(value);

}


function formatDate(date) {

  return date.toLocaleDateString(
    "es-AR",
    {
      day: "2-digit",
      month: "2-digit",
      year: "numeric"
    }
  );

}


function monthKey(date) {

  return (
    date.getFullYear() +
    "-" +
    String(date.getMonth() + 1).padStart(2, "0")
  );

}


function firstDayOfMonth(date) {

  return new Date(
    date.getFullYear(),
    date.getMonth(),
    1
  );

}


function lastDayOfMonth(date) {

  return new Date(
    date.getFullYear(),
    date.getMonth() + 1,
    0
  );

}


// ==========================================
// SUMAR MESES SIN ROMPER DÍAS 29/30/31
// ==========================================

function addMonthsClamped(date, months) {

  const year = date.getFullYear();

  const month = date.getMonth() + months;

  const day = date.getDate();

  const lastDay = new Date(
    year,
    month + 1,
    0
  ).getDate();

  return new Date(
    year,
    month,
    Math.min(day, lastDay)
  );

}


// ==========================================
// FECHA DE OCURRENCIA
// ==========================================

function occurrenceDate(service, targetDate) {

  const original = parseDate(service.dueDate);

  const repeat = service.repeat || "once";

  if (repeat === "once") {
    return original;
  }


  let interval = 1;

  if (repeat === "2months") {
    interval = 2;
  }

  if (repeat === "quarterly") {
    interval = 3;
  }

  if (repeat === "yearly") {
    interval = 12;
  }


  const targetStart = firstDayOfMonth(targetDate);

  const originalStart = firstDayOfMonth(original);


  if (originalStart > targetStart) {
    return original;
  }


  let current = original;

  let safety = 0;

  while (
    firstDayOfMonth(current) < targetStart &&
    safety < 500
  ) {

    current = addMonthsClamped(
      current,
      interval
    );

    safety++;

  }


  return current;

}


// ==========================================
// REPETICIÓN EN TEXTO
// ==========================================

function repeatLabel(repeat) {

  switch (repeat) {

    case "monthly":
      return "Todos los meses";

    case "2months":
      return "Cada 2 meses";

    case "quarterly":
      return "Cada 3 meses";

    case "yearly":
      return "Todos los años";

    default:
      return "Una sola vez";

  }

}


// ==========================================
// ESTÁ PAGADO?
// ==========================================

function isPaid(service, occurrence) {

  const key = monthKey(occurrence);


  // Nueva estructura

  if (
    Array.isArray(service.payments) &&
    service.payments.some(
      payment => payment.monthKey === key
    )
  ) {

    return true;

  }


  // Compatibilidad con versión anterior

  if (
    Array.isArray(service.paidMonths) &&
    service.paidMonths.includes(key)
  ) {

    return true;

  }


  // Servicio único

  if (
    service.repeat === "once" &&
    service.paid === true
  ) {

    return true;

  }


  return false;

}


// ==========================================
// ITEMS DEL MES
// ==========================================

function getItems() {

  return data.map(service => {

    const dueDate =
      occurrenceDate(
        service,
        currentDate
      );

    const paid =
      isPaid(
        service,
        dueDate
      );


    return {
      service,
      dueDate,
      paid
    };

  }).filter(item => {

    // Una sola vez: solamente mostrar si
    // pertenece al mes seleccionado

    if (
      item.service.repeat === "once"
    ) {

      return (
        item.dueDate.getFullYear() ===
          currentDate.getFullYear() &&
        item.dueDate.getMonth() ===
          currentDate.getMonth()
      );

    }


    // Recurrentes: mostrar siempre
    // si ya empezaron

    return (
      firstDayOfMonth(item.dueDate) <=
      lastDayOfMonth(currentDate)
    );

  });

}


// ==========================================
// ESTADO
// ==========================================

function getStatus(item) {

  if (item.paid) {
    return "paid";
  }


  const today = new Date();

  today.setHours(0, 0, 0, 0);


  const due = new Date(item.dueDate);

  due.setHours(0, 0, 0, 0);


  if (due < today) {
    return "overdue";
  }


  return "pending";

}


// ==========================================
// TEXTO DEL ESTADO
// ==========================================

function statusText(item) {

  const status = getStatus(item);


  if (status === "paid") {
    return "Pagado";
  }


  const today = new Date();

  today.setHours(0, 0, 0, 0);


  const due = new Date(item.dueDate);

  due.setHours(0, 0, 0, 0);


  const diff =
    Math.round(
      (due - today) /
      (1000 * 60 * 60 * 24)
    );


  if (status === "overdue") {

    const days = Math.abs(diff);

    return days === 1
      ? "Vencido hace 1 día"
      : `Vencido hace ${days} días`;

  }


  if (diff === 0) {
    return "Vence hoy";
  }

  if (diff === 1) {
    return "Vence mañana";
  }

  return `Vence en ${diff} días`;

}


// ==========================================
// FORMATEAR DINERO
// ==========================================

function money(value) {

  return new Intl.NumberFormat(
    "es-AR",
    {
      style: "currency",
      currency: "ARS",
      maximumFractionDigits: 0
    }
  ).format(
    Number(value) || 0
  );

}


// ==========================================
// ESCAPAR HTML
// ==========================================

function escapeHTML(value) {

  if (value === null || value === undefined) {
    return "";
  }

  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

}


// ==========================================
// ICONO
// ==========================================

function serviceIcon(service) {

  const name =
    (
      service.name ||
      ""
    ).toLowerCase();


  if (
    name.includes("luz") ||
    name.includes("electric")
  ) {
    return "⚡";
  }

  if (
    name.includes("gas")
  ) {
    return "🔥";
  }

  if (
    name.includes("agua")
  ) {
    return "💧";
  }

  if (
    name.includes("internet") ||
    name.includes("fibra")
  ) {
    return "🌐";
  }

  if (
    name.includes("celular") ||
    name.includes("telefono") ||
    name.includes("teléfono")
  ) {
    return "📱";
  }

  if (
    name.includes("alquiler")
  ) {
    return "🏠";
  }

  if (
    name.includes("seguro")
  ) {
    return "🛡";
  }

  if (
    name.includes("tarjeta") ||
    name.includes("visa") ||
    name.includes("master")
  ) {
    return "💳";
  }

  if (
    name.includes("cable") ||
    name.includes("tv")
  ) {
    return "📺";
  }

  return "$";

}


// ==========================================
// RENDER PRINCIPAL
// ==========================================

function render() {

  updateMonthLabel();


  const items = getItems();


  let pending = 0;
  let paid = 0;
  let overdue = 0;
  let total = 0;


  items.forEach(item => {

    const status =
      getStatus(item);


    if (status === "paid") {

      paid++;

    } else if (status === "overdue") {

      overdue++;

      pending++;

      total +=
        Number(item.service.amount) || 0;

    } else {

      pending++;

      total +=
        Number(item.service.amount) || 0;

    }

  });


  pendingCount.textContent = pending;

  paidCount.textContent = paid;

  overdueCount.textContent = overdue;

  totalPending.textContent =
    money(total);


  renderServices(items);

}


// ==========================================
// MES
// ==========================================

function updateMonthLabel() {

  monthLabel.textContent =
    currentDate.toLocaleDateString(
      "es-AR",
      {
        month: "long",
        year: "numeric"
      }
    );

}


// ==========================================
// RENDER SERVICIOS
// ==========================================

function renderServices(items) {

  // En inicio mostramos primero
  // pendientes/vencidos y luego pagados

  const sorted =
    [...items].sort(
      (a, b) => {

        if (
          a.paid !== b.paid
        ) {
          return a.paid ? 1 : -1;
        }

        return (
          a.dueDate -
          b.dueDate
        );

      }
    );


  if (!sorted.length) {

    serviceList.innerHTML = `

      <div class="empty-state">

        <div class="empty-icon">
          ✓
        </div>

        <strong>
          No hay servicios
        </strong>

        <p>
          Agregá tu primer servicio para empezar a llevar el control.
        </p>

      </div>

    `;

    return;

  }


  serviceList.innerHTML =
    sorted.map(
      item => serviceCardHTML(item)
    ).join("");


  document
    .querySelectorAll(".service-card")
    .forEach(card => {

      card.addEventListener(
        "click",
        () => {

          const id =
            card.dataset.id;

          openDetail(id);

        }
      );

    });

}


// ==========================================
// TARJETA
// ==========================================

function serviceCardHTML(item) {

  const service =
    item.service;

  const status =
    getStatus(item);


  let statusClass =
    "status-pending";

  if (status === "paid") {
    statusClass = "status-paid";
  }

  if (status === "overdue") {
    statusClass = "status-overdue";
  }


  return `

    <div
      class="service-card"
      data-id="${escapeHTML(service.id)}"
    >

      <div class="service-main">

        <div class="service-icon">
          ${serviceIcon(service)}
        </div>


        <div class="service-info">

          <div class="service-name">
            ${escapeHTML(service.name)}
          </div>

          <div class="service-provider">
            ${escapeHTML(
              service.provider ||
              "Sin proveedor"
            )}
          </div>

        </div>


        <div class="service-right">

          <div class="service-amount">
            ${money(service.amount)}
          </div>

          <span
            class="service-status ${statusClass}"
          >
            ${
              status === "paid"
                ? "Pagado"
                : status === "overdue"
                  ? "Vencido"
                  : "Pendiente"
            }
          </span>

        </div>

      </div>


      <div class="service-footer">

        <span>
          Vencimiento
        </span>

        <strong>
          ${formatDate(item.dueDate)}
        </strong>

      </div>

    </div>

  `;

}


// ==========================================
// DETALLE
// ==========================================

function openDetail(id) {

  const service =
    data.find(
      item => String(item.id) === String(id)
    );


  if (!service) {
    return;
  }


  selectedServiceId =
    service.id;


  const dueDate =
    occurrenceDate(
      service,
      currentDate
    );


  const paid =
    isPaid(
      service,
      dueDate
    );


  const status =
    paid
      ? "paid"
      : getStatus({
          service,
          dueDate,
          paid
        });


  document.getElementById(
    "detailIcon"
  ).textContent =
    serviceIcon(service);


  document.getElementById(
    "detailName"
  ).textContent =
    service.name;


  document.getElementById(
    "detailProvider"
  ).textContent =
    service.provider ||
    "Sin proveedor";


  document.getElementById(
    "detailAmount"
  ).textContent =
    money(service.amount);


  document.getElementById(
    "detailDate"
  ).textContent =
    formatDate(dueDate);


  document.getElementById(
    "detailRepeat"
  ).textContent =
    repeatLabel(
      service.repeat
    );


  document.getElementById(
    "detailNotes"
  ).textContent =
    service.notes?.trim()
      ? service.notes
      : "Sin observaciones.";


  const statusElement =
    document.getElementById(
      "detailStatus"
    );


  statusElement.textContent =
    statusText({
      service,
      dueDate,
      paid
    });


  statusElement.className =
    "detail-status";


  if (status === "paid") {

    statusElement.classList.add(
      "paid"
    );

  } else if (status === "overdue") {

    statusElement.classList.add(
      "overdue"
    );

  }


  const payButton =
    document.getElementById(
      "detailPayBtn"
    );


  if (paid) {

    payButton.textContent =
      "↩ Marcar como pendiente";

  } else {

    payButton.textContent =
      "✓ Marcar como pagado";

  }


  detailBackdrop.classList.add(
    "open"
  );

}


// ==========================================
// CERRAR DETALLE
// ==========================================

function closeDetail() {

  detailBackdrop.classList.remove(
    "open"
  );

  selectedServiceId = null;

}


// ==========================================
// MARCAR PAGADO / PENDIENTE
// ==========================================

function togglePayment() {

  if (!selectedServiceId) {
    return;
  }


  const service =
    data.find(
      item =>
        String(item.id) ===
        String(selectedServiceId)
    );


  if (!service) {
    return;
  }


  const dueDate =
    occurrenceDate(
      service,
      currentDate
    );


  const key =
    monthKey(dueDate);


  if (!Array.isArray(service.payments)) {
    service.payments = [];
  }

  if (!Array.isArray(service.paidMonths)) {
    service.paidMonths = [];
  }


  const index =
    service.payments.findIndex(
      payment =>
        payment.monthKey === key
    );


  const currentlyPaid =
    index !== -1 ||
    service.paidMonths.includes(key) ||
    (
      service.repeat === "once" &&
      service.paid === true
    );


  if (currentlyPaid) {

    // Quitar registro nuevo

    service.payments =
      service.payments.filter(
        payment =>
          payment.monthKey !== key
      );


    // Quitar registro antiguo

    service.paidMonths =
      service.paidMonths.filter(
        month =>
          month !== key
      );


    if (service.repeat === "once") {
      service.paid = false;
    }


    showToast(
      "Pago marcado como pendiente"
    );

  } else {

    service.payments.push({

      monthKey: key,

      paidAt:
        new Date().toISOString(),

      amount:
        Number(service.amount) || 0

    });


    // Compatibilidad

    if (
      !service.paidMonths.includes(key)
    ) {

      service.paidMonths.push(key);

    }


    if (service.repeat === "once") {
      service.paid = true;
    }


    showToast(
      "✓ Pago registrado"
    );

  }


  saveData();

  closeDetail();

  render();

}


// ==========================================
// FORMULARIO NUEVO
// ==========================================

function openNewService() {

  serviceForm.reset();


  document.getElementById(
    "serviceId"
  ).value = "";


  document.getElementById(
    "formTitle"
  ).textContent =
    "Nuevo servicio";


  document.getElementById(
    "serviceRepeat"
  ).value =
    "monthly";


  formBackdrop.classList.add(
    "open"
  );

}


// ==========================================
// EDITAR
// ==========================================

function openEditService(id) {

  const service =
    data.find(
      item =>
        String(item.id) ===
        String(id)
    );


  if (!service) {
    return;
  }


  document.getElementById(
    "serviceId"
  ).value =
    service.id;


  document.getElementById(
    "serviceName"
  ).value =
    service.name || "";


  document.getElementById(
    "serviceProvider"
  ).value =
    service.provider || "";


  document.getElementById(
    "serviceAmount"
  ).value =
    service.amount || "";


  document.getElementById(
    "serviceDueDate"
  ).value =
    service.dueDate || "";


  document.getElementById(
    "serviceRepeat"
  ).value =
    service.repeat || "once";


  document.getElementById(
    "serviceNotes"
  ).value =
    service.notes || "";


  document.getElementById(
    "formTitle"
  ).textContent =
    "Editar servicio";


  formBackdrop.classList.add(
    "open"
  );

}


// ==========================================
// GUARDAR FORMULARIO
// ==========================================

function saveService(event) {

  event.preventDefault();


  const id =
    document.getElementById(
      "serviceId"
    ).value;


  const serviceData = {

    name:
      document.getElementById(
        "serviceName"
      ).value.trim(),

    provider:
      document.getElementById(
        "serviceProvider"
      ).value.trim(),

    amount:
      Number(
        document.getElementById(
          "serviceAmount"
        ).value
      ),

    dueDate:
      document.getElementById(
        "serviceDueDate"
      ).value,

    repeat:
      document.getElementById(
        "serviceRepeat"
      ).value,

    notes:
      document.getElementById(
        "serviceNotes"
      ).value.trim()

  };


  if (id) {

    const index =
      data.findIndex(
        service =>
          String(service.id) ===
          String(id)
      );


    if (index !== -1) {

      data[index] = {

        ...data[index],

        ...serviceData

      };

    }


    showToast(
      "Servicio actualizado"
    );

  } else {

    data.push({

      id:
        Date.now().toString(),

      ...serviceData,

      paid: false,

      paidMonths: [],

      payments: []

    });


    showToast(
      "✓ Servicio agregado"
    );

  }


  saveData();

  formBackdrop.classList.remove(
    "open"
  );

  render();

}


// ==========================================
// ELIMINAR
// ==========================================

function deleteSelectedService() {

  if (!selectedServiceId) {
    return;
  }


  const service =
    data.find(
      item =>
        String(item.id) ===
        String(selectedServiceId)
    );


  if (!service) {
    return;
  }


  const confirmed =
    confirm(
      `¿Querés eliminar "${service.name}"?`
    );


  if (!confirmed) {
    return;
  }


  data =
    data.filter(
      item =>
        String(item.id) !==
        String(selectedServiceId)
    );


  saveData();

  closeDetail();

  render();


  showToast(
    "Servicio eliminado"
  );

}


// ==========================================
// HISTORIAL
// ==========================================

function openHistory() {

  renderHistory();


  historyBackdrop.classList.add(
    "open"
  );

}


// ==========================================
// RENDER HISTORIAL
// ==========================================

function renderHistory() {

  const historyList =
    document.getElementById(
      "historyList"
    );


  let records = [];


  data.forEach(service => {

    // Pagos nuevos

    if (
      Array.isArray(service.payments)
    ) {

      service.payments.forEach(
        payment => {

          records.push({

            service,

            monthKey:
              payment.monthKey,

            paidAt:
              payment.paidAt || null,

            amount:
              payment.amount ??
              service.amount

          });

        }
      );

    }


    // Recuperar pagos viejos
    // que no estén en payments

    if (
      Array.isArray(service.paidMonths)
    ) {

      service.paidMonths.forEach(
        key => {

          const exists =
            records.some(
              record =>
                record.service.id ===
                  service.id &&
                record.monthKey ===
                  key
            );


          if (!exists) {

            records.push({

              service,

              monthKey: key,

              paidAt: null,

              amount:
                service.amount

            });

          }

        }
      );

    }


    // Compatibilidad servicio único

    if (
      service.repeat === "once" &&
      service.paid === true
    ) {

      const key =
        monthKey(
          parseDate(
            service.dueDate
          )
        );


      const exists =
        records.some(
          record =>
            record.service.id ===
              service.id &&
            record.monthKey ===
              key
        );


      if (!exists) {

        records.push({

          service,

          monthKey: key,

          paidAt: null,

          amount:
            service.amount

        });

      }

    }

  });


  // Ordenar más reciente primero

  records.sort(
    (a, b) => {

      const dateA =
        a.paidAt
          ? new Date(a.paidAt).getTime()
          : new Date(
              a.monthKey + "-01"
            ).getTime();


      const dateB =
        b.paidAt
          ? new Date(b.paidAt).getTime()
          : new Date(
              b.monthKey + "-01"
            ).getTime();


      return dateB - dateA;

    }
  );


  if (!records.length) {

    historyList.innerHTML = `

      <div class="history-empty">

        <div style="font-size:34px;margin-bottom:12px;">
          ↺
        </div>

        <strong>
          Todavía no hay pagos registrados
        </strong>

        <span>
          Cuando marques un servicio como pagado,
          aparecerá acá.
        </span>

      </div>

    `;

    return;

  }


  historyList.innerHTML =
    records.map(
      record => {

        const monthDate =
          parseDate(
            record.monthKey + "-01"
          );


        const period =
          monthDate.toLocaleDateString(
            "es-AR",
            {
              month: "long",
              year: "numeric"
            }
          );


        let paidDate =
          "Pago registrado";


        if (record.paidAt) {

          paidDate =
            "Pagado el " +
            new Date(
              record.paidAt
            ).toLocaleDateString(
              "es-AR",
              {
                day: "2-digit",
                month: "2-digit",
                year: "numeric"
              }
            );

        }


        return `

          <div class="history-item">

            <div class="history-icon">
              ✓
            </div>


            <div class="history-info">

              <div class="history-name">
                ${escapeHTML(
                  record.service.name
                )}
              </div>

              <div class="history-meta">

                ${escapeHTML(
                  record.service.provider ||
                  "Sin proveedor"
                )}

                <br>

                Período:
                ${escapeHTML(period)}

                <br>

                ${paidDate}

              </div>

            </div>


            <div class="history-amount">

              ${money(
                record.amount
              )}

              <span class="history-paid">
                PAGADO
              </span>

            </div>

          </div>

        `;

      }
    ).join("");

}


// ==========================================
// MOSTRAR TODOS
// ==========================================

function showAllServices() {

  const items =
    getItems();


  const sorted =
    [...items].sort(
      (a, b) =>
        a.dueDate -
        b.dueDate
    );


  serviceList.innerHTML =
    sorted.length
      ? sorted.map(
          item =>
            serviceCardHTML(item)
        ).join("")
      : `

        <div class="empty-state">

          <strong>
            No hay servicios
          </strong>

          <p>
            No tenés servicios registrados para este período.
          </p>

        </div>

      `;


  document
    .querySelectorAll(".service-card")
    .forEach(card => {

      card.addEventListener(
        "click",
        () => {

          openDetail(
            card.dataset.id
          );

        }
      );

    });

}


// ==========================================
// TOAST
// ==========================================

let toastTimer;


function showToast(message) {

  clearTimeout(toastTimer);


  toast.textContent =
    message;


  toast.classList.add(
    "show"
  );


  toastTimer =
    setTimeout(
      () => {

        toast.classList.remove(
          "show"
        );

      },
      2200
    );

}


// ==========================================
// NAVEGACIÓN
// ==========================================

function setActiveNav(button) {

  document
    .querySelectorAll(".nav-item")
    .forEach(
      item =>
        item.classList.remove(
          "active"
        )
    );


  button.classList.add(
    "active"
  );

}


document
  .querySelectorAll(".nav-item")
  .forEach(button => {

    button.addEventListener(
      "click",
      () => {

        const nav =
          button.dataset.nav;


        setActiveNav(button);


        if (nav === "home") {

          render();

          return;

        }


        if (nav === "services") {

          showAllServices();

          return;

        }


        if (nav === "history") {

          openHistory();

          return;

        }


        if (nav === "more") {

          showToast(
            "Usá + para agregar un servicio"
          );

        }

      }
    );

  });


// ==========================================
// BOTONES
// ==========================================

document
  .getElementById("addBtn")
  .addEventListener(
    "click",
    openNewService
  );


document
  .getElementById("closeForm")
  .addEventListener(
    "click",
    () => {

      formBackdrop.classList.remove(
        "open"
      );

    }
  );


document
  .getElementById("closeDetail")
  .addEventListener(
    "click",
    closeDetail
  );


document
  .getElementById("closeHistory")
  .addEventListener(
    "click",
    () => {

      historyBackdrop.classList.remove(
        "open"
      );

    }
  );


document
  .getElementById("detailPayBtn")
  .addEventListener(
    "click",
    togglePayment
  );


document
  .getElementById("detailEditBtn")
  .addEventListener(
    "click",
    () => {

      if (!selectedServiceId) {
        return;
      }


      const id =
        selectedServiceId;


      closeDetail();

      openEditService(id);

    }
  );


document
  .getElementById("detailDeleteBtn")
  .addEventListener(
    "click",
    deleteSelectedService
  );


document
  .getElementById("showAllBtn")
  .addEventListener(
    "click",
    showAllServices
  );


// ==========================================
// CAMBIO DE MES
// ==========================================

document
  .getElementById("prevMonth")
  .addEventListener(
    "click",
    () => {

      currentDate =
        new Date(
          currentDate.getFullYear(),
          currentDate.getMonth() - 1,
          1
        );


      render();

    }
  );


document
  .getElementById("nextMonth")
  .addEventListener(
    "click",
    () => {

      currentDate =
        new Date(
          currentDate.getFullYear(),
          currentDate.getMonth() + 1,
          1
        );


      render();

    }
  );


// ==========================================
// FORM
// ==========================================

serviceForm.addEventListener(
  "submit",
  saveService
);


// ==========================================
// CERRAR MODALES TOCANDO AFUERA
// ==========================================

formBackdrop.addEventListener(
  "click",
  event => {

    if (
      event.target ===
      formBackdrop
    ) {

      formBackdrop.classList.remove(
        "open"
      );

    }

  }
);


detailBackdrop.addEventListener(
  "click",
  event => {

    if (
      event.target ===
      detailBackdrop
    ) {

      closeDetail();

    }

  }
);


historyBackdrop.addEventListener(
  "click",
  event => {

    if (
      event.target ===
      historyBackdrop
    ) {

      historyBackdrop.classList.remove(
        "open"
      );

    }

  }
);


// ==========================================
// ESC PARA CERRAR
// ==========================================

document.addEventListener(
  "keydown",
  event => {

    if (event.key !== "Escape") {
      return;
    }


    formBackdrop.classList.remove(
      "open"
    );

    closeDetail();

    historyBackdrop.classList.remove(
      "open"
    );

  }
);


// ==========================================
// INICIAR
// ==========================================

loadData();

render();
