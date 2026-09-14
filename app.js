const KEY = "misServicios_v1";

let data =
  JSON.parse(
    localStorage.getItem(KEY) || "[]"
  );


let viewDate = new Date();

viewDate.setDate(1);


/* ATAJO */

const $ = id =>
  document.getElementById(id);


/* DINERO */

const money = number => {

  return new Intl.NumberFormat(
    "es-AR",
    {
      style: "currency",
      currency: "ARS",
      maximumFractionDigits: 0
    }
  ).format(
    Number(number) || 0
  );

};


/* FECHA */

const fmtDate = date => {

  return new Intl.DateTimeFormat(
    "es-AR",
    {
      day: "2-digit",
      month: "2-digit",
      year: "numeric"
    }
  ).format(date);

};


/* NOMBRE DEL MES */

const monthName = date => {

  return new Intl.DateTimeFormat(
    "es-AR",
    {
      month: "long",
      year: "numeric"
    }
  )
  .format(date)
  .replace(
    /^./,
    character =>
      character.toUpperCase()
  );

};


/* DIFERENCIA DE DÍAS */

function daysBetween(a, b) {

  return Math.round(

    (
      new Date(
        a.getFullYear(),
        a.getMonth(),
        a.getDate()
      )

      -

      new Date(
        b.getFullYear(),
        b.getMonth(),
        b.getDate()
      )

    ) / 86400000

  );

}


/* PARSEAR FECHA */

function parseDate(value) {

  const [
    year,
    month,
    day
  ] =
    value
      .split("-")
      .map(Number);

  return new Date(
    year,
    month - 1,
    day
  );

}


/* ICONOS */

function icon(name) {

  const n =
    name.toLowerCase();


  if (
    n.includes("internet")
  )
    return "⌁";


  if (
    n.includes("luz") ||
    n.includes("electric")
  )
    return "ϟ";


  if (
    n.includes("seguro")
  )
    return "♜";


  if (
    n.includes("celular") ||
    n.includes("telefono")
  )
    return "▣";


  if (
    n.includes("stream")
  )
    return "▶";


  if (
    n.includes("expensa")
  )
    return "⌂";


  if (
    n.includes("agua")
  )
    return "💧";


  return "●";

}


/* GUARDAR */

function save() {

  localStorage.setItem(
    KEY,
    JSON.stringify(data)
  );

  render();

}


/* CALCULAR FECHA RECURRENTE */

function occurrenceDate(
  originalDate,
  repeat,
  target
) {

  let date =
    parseDate(originalDate);


  if (
    repeat === "none"
  )
    return date;


  while (
    date <
    new Date(
      target.getFullYear(),
      target.getMonth(),
      1
    )
  ) {

    if (
      repeat === "monthly"
    ) {

      date.setMonth(
        date.getMonth() + 1
      );

    }


    if (
      repeat === "bimonthly"
    ) {

      date.setMonth(
        date.getMonth() + 2
      );

    }


    if (
      repeat === "quarterly"
    ) {

      date.setMonth(
        date.getMonth() + 3
      );

    }


    if (
      repeat === "yearly"
    ) {

      date.setFullYear(
        date.getFullYear() + 1
      );

    }

  }


  return date;

}


/* OBTENER SERVICIOS DEL MES */

function getItems() {

  const first =
    new Date(
      viewDate.getFullYear(),
      viewDate.getMonth(),
      1
    );


  const last =
    new Date(
      viewDate.getFullYear(),
      viewDate.getMonth() + 1,
      0
    );


  return data

    .map(service => {

      const due =
        occurrenceDate(
          service.dueDate,
          service.repeat,
          first
        );


      let paid = false;


      if (
        service.repeat === "none"
      ) {

        paid =
          !!service.paid;

      }


      else {

        paid =
          !!(
            service.paidMonths ||
            []
          ).includes(

            `${due.getFullYear()}-${
              String(
                due.getMonth() + 1
              ).padStart(2,"0")
            }`

          );

      }


      return {

        ...service,
        due,
        paid

      };

    })


    .filter(service =>

      service.due <= last &&
      service.due >= first

    );

}


/* RENDERIZAR */

function render() {

  $("monthLabel")
    .textContent =
    monthName(viewDate);


  const items =
    getItems();


  const today =
    new Date();


  today.setHours(
    0,0,0,0
  );


  let due = 0;
  let paid = 0;
  let overdue = 0;
  let total = 0;


  items.forEach(service => {

    if (
      service.paid
    ) {

      paid++;

    }


    else if (
      service.due < today
    ) {

      overdue++;

      total +=
        Number(
          service.amount
        );

    }


    else {

      due++;

      total +=
        Number(
          service.amount
        );

    }

  });


  $("dueCount")
    .textContent =
    due;


  $("paidCount")
    .textContent =
    paid;


  $("overdueCount")
    .textContent =
    overdue;


  $("pendingTotal")
    .textContent =
    money(total);


  const list =
    $("serviceList");


  list.innerHTML = "";


  const visible =
    items

      .filter(
        service =>
          !service.paid
      )

      .sort(
        (a,b) =>
          a.due - b.due
      );


  $("emptyState")
    .classList
    .toggle(
      "hidden",
      visible.length !== 0
    );


  visible.forEach(
    service => {

      const diff =
        daysBetween(
          service.due,
          today
        );


      let badge;


      if (
        diff < 0
      ) {

        badge =
          `<span class="badge overdue">
             Vencido
           </span>`;

      }


      else {

        badge =
          `<span class="badge due">
            ${
              diff === 0
                ? "Vence hoy"
                : `Vence en ${diff}
                   día${diff === 1 ? "" : "s"}`
            }
          </span>`;

      }


      const element =
        document.createElement(
          "article"
        );


      element.className =
        "service-card";


      element.innerHTML = `

        <div class="service-icon">

          ${icon(service.name)}

        </div>


        <div class="service-info">

          <div class="service-name">

            ${escapeHTML(service.name)}

          </div>


          <div class="service-date">

            ${fmtDate(service.due)}

          </div>

        </div>


        <div class="service-right">

          <div class="amount">

            ${money(service.amount)}

          </div>


          ${badge}


          <br>


          <button
            class="pay-btn"
            onclick="markPaid('${service.id}')">

            ✓ Pagar

          </button>

        </div>

      `;


      element.addEventListener(
        "dblclick",
        () =>
          editService(
            service.id
          )
      );


      list.appendChild(
        element
      );

    }

  );

}


/* SEGURIDAD HTML */

function escapeHTML(text) {

  return String(text || "")
    .replace(
      /[&<>"']/g,
      character => ({

        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"

      }[character])

    );

}


/* MARCAR PAGADO */

window.markPaid =
function(id) {

  const service =
    data.find(
      item =>
        item.id === id
    );


  if (!service)
    return;


  if (
    service.repeat === "none"
  ) {

    service.paid = true;

  }


  else {

    service.paidMonths =
      service.paidMonths || [];


    const due =
      occurrenceDate(
        service.dueDate,
        service.repeat,
        viewDate
      );


    const key =
      `${due.getFullYear()}-${
        String(
          due.getMonth() + 1
        ).padStart(2,"0")
      }`;


    if (
      !service.paidMonths
        .includes(key)
    ) {

      service.paidMonths.push(
        key
      );

    }

  }


  save();


  toast(
    "Servicio marcado como pagado ✓"
  );

};


/* ABRIR MODAL */

function openModal(
  service = null
) {

  $("modalBackdrop")
    .classList
    .remove("hidden");


  $("modalTitle")
    .textContent =
    service
      ? "Editar servicio"
      : "Agregar servicio";


  $("serviceId")
    .value =
    service?.id || "";


  $("name")
    .value =
    service?.name || "";


  $("provider")
    .value =
    service?.provider || "";


  $("amount")
    .value =
    service?.amount || "";


  $("dueDate")
    .value =
    service?.dueDate ||
    new Date()
      .toISOString()
      .slice(0,10);


  $("repeat")
    .value =
    service?.repeat ||
    "monthly";


  $("notes")
    .value =
    service?.notes || "";

}


/* CERRAR MODAL */

function closeModal() {

  $("modalBackdrop")
    .classList
    .add("hidden");


  $("serviceForm")
    .reset();


  $("serviceId")
    .value = "";

}


/* EDITAR */

function editService(id) {

  const service =
    data.find(
      item =>
        item.id === id
    );


  if (service)
    openModal(service);

}


window.editService =
  editService;


/* GUARDAR FORMULARIO */

$("serviceForm")
  .addEventListener(
    "submit",
    event => {

      event.preventDefault();


      const id =
        $("serviceId").value;


      const service = {

        id:
          id ||
          crypto.randomUUID(),

        name:
          $("name")
            .value
            .trim(),

        provider:
          $("provider")
            .value
            .trim(),

        amount:
          Number(
            $("amount").value
          ),

        dueDate:
          $("dueDate").value,

        repeat:
          $("repeat").value,

        notes:
          $("notes")
            .value
            .trim(),

        paid: false

      };


      if (id) {

        const index =
          data.findIndex(
            item =>
              item.id === id
          );


        service.paid =
          data[index]?.paid ||
          false;


        service.paidMonths =
          data[index]?.paidMonths ||
          [];


        data[index] =
          service;

      }


      else {

        data.push(
          service
        );

      }


      save();


      closeModal();


      toast(
        id
          ? "Servicio actualizado"
          : "Servicio agregado"
      );

    }
  );


/* BOTÓN AGREGAR */

$("addBtn")
  .onclick =
  () =>
    openModal();


/* CERRAR */

$("closeModal")
  .onclick =
  closeModal;


/* CLICK AFUERA */

$("modalBackdrop")
  .addEventListener(
    "click",
    event => {

      if (
        event.target ===
        $("modalBackdrop")
      ) {

        closeModal();

      }

    }
  );


/* MES ANTERIOR */

$("prevMonth")
  .onclick =
  () => {

    viewDate.setMonth(
      viewDate.getMonth() - 1
    );

    render();

  };


/* MES SIGUIENTE */

$("nextMonth")
  .onclick =
  () => {

    viewDate.setMonth(
      viewDate.getMonth() + 1
    );

    render();

  };


/* MES ACTUAL */

$("showAllBtn")
  .onclick =
  () => {

    viewDate =
      new Date();


    viewDate.setDate(1);


    render();


    toast(
      "Mostrando el mes actual"
    );

  };


/* CONFIGURACIÓN */

$("settingsBtn")
  .onclick =
  () =>
    toast(
      "Configuración próximamente"
    );


/* NAV */

document
  .querySelectorAll(".nav-item")
  .forEach(button => {

    button.onclick =
      () => {

        document
          .querySelectorAll(
            ".nav-item"
          )
          .forEach(item =>
            item.classList
              .remove("active")
          );


        button.classList
          .add("active");


        if (
          button.dataset.view ===
          "home"
        ) {

          toast(
            "Inicio"
          );

        }

        else {

          toast(
            "Esta sección se puede ampliar en la próxima versión"
          );

        }

      };

  });


/* TOAST */

function toast(message) {

  const element =
    $("toast");


  element.textContent =
    message;


  element.classList
    .add("show");


  setTimeout(
    () =>
      element.classList
        .remove("show"),
    2200
  );

}


/* INICIAR */

render();
