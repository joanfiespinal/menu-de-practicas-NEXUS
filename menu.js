
/* =========================================
   NEXUS // ACADEMIC OS
   Menú dinámico de prácticas
   ========================================= */

"use strict";

// Elementos principales de la página
const listaPracticas = document.getElementById("listaPracticas");
const buscarPractica = document.getElementById("buscarPractica");
const botonesFiltro = document.querySelectorAll(".filter-btn");
const resultados = document.getElementById("resultados");
const totalPracticas = document.getElementById("totalPracticas");

// Elementos de la ventana de detalles
const modal = document.getElementById("modalPractica");
const cerrarModalBtn = document.getElementById("cerrarModal");
const cerrarFondo = document.getElementById("cerrarFondo");
const modalNumero = document.getElementById("modalNumero");
const modalTitulo = document.getElementById("modalTitulo");
const modalDescripcion = document.getElementById("modalDescripcion");
const modalCategoria = document.getElementById("modalCategoria");
const modalEstado = document.getElementById("modalEstado");
const modalEnlace = document.getElementById("modalEnlace");

// Datos del menú
let practicas = [];
let filtroActual = "todas";

// Colores disponibles para las tarjetas
const colores = {
    cyan: "#00e5ff",
    purple: "#a855f7",
    green: "#57ffb0"
};

/* =========================================
   CARGAR DATOS DESDE menu.json
   ========================================= */

async function cargarPracticas() {
    try {
        const respuesta = await fetch("menu.json", {
            cache: "no-store"
        });

        if (!respuesta.ok) {
            throw new Error(
                `No se pudo cargar menu.json. Código: ${respuesta.status}`
            );
        }

        const datos = await respuesta.json();

        if (!Array.isArray(datos)) {
            throw new Error("El archivo menu.json debe contener una lista.");
        }

        practicas = datos;

        // Actualizar automáticamente el total de actividades
        totalPracticas.textContent = practicas.length;

        mostrarPracticas();

    } catch (error) {
        console.error("Error al cargar las prácticas:", error);

        listaPracticas.replaceChildren();

        const mensaje = document.createElement("div");
        mensaje.className = "empty-state";
        mensaje.textContent =
            "NO SE PUDIERON CARGAR LAS PRÁCTICAS. " +
            "Verifica menu.json y ejecuta el proyecto mediante un servidor local.";

        listaPracticas.appendChild(mensaje);

        resultados.textContent = "Error al cargar los módulos.";
        totalPracticas.textContent = "0";
    }
}

/* =========================================
   CREAR TARJETAS
   ========================================= */

function crearTarjeta(practica, indice) {
    const tarjeta = document.createElement("article");

    tarjeta.className = "practice-card";
    tarjeta.tabIndex = 0;
    tarjeta.setAttribute("role", "button");

    tarjeta.setAttribute(
        "aria-label",
        `Ver detalles de la práctica ${practica.numero}: ${practica.titulo}`
    );

    // Aplicar el color de cada tarjeta
    const color = colores[practica.color] || colores.cyan;
    tarjeta.style.setProperty("--card-accent", color);
    tarjeta.style.animationDelay = `${Math.min(indice, 8) * 45}ms`;

    // Parte superior
    const parteSuperior = document.createElement("div");
    parteSuperior.className = "card-top";

    const numero = document.createElement("span");
    numero.className = "card-number";
    numero.textContent = `PRÁCTICA ${practica.numero}`;

    const icono = document.createElement("span");
    icono.className = "card-icon";
    icono.setAttribute("aria-hidden", "true");
    icono.textContent = practica.icono || "◇";

    parteSuperior.append(numero, icono);

    // Contenido central
    const contenido = document.createElement("div");
    contenido.className = "card-content";

    const titulo = document.createElement("h3");
    titulo.textContent = practica.titulo;

    const descripcion = document.createElement("p");
    descripcion.textContent = practica.descripcion;

    contenido.append(titulo, descripcion);

    // Parte inferior
    const parteInferior = document.createElement("div");
    parteInferior.className = "card-bottom";

    const categoria = document.createElement("span");
    categoria.className = "card-category";
    categoria.textContent = practica.etiqueta || practica.categoria;

    const abrir = document.createElement("span");
    abrir.className = "card-open";
    abrir.append(document.createTextNode("VER DETALLES "));

    const flecha = document.createElement("span");
    flecha.textContent = "↗";
    flecha.setAttribute("aria-hidden", "true");

    abrir.appendChild(flecha);
    parteInferior.append(categoria, abrir);

    tarjeta.append(parteSuperior, contenido, parteInferior);

    // Abrir los detalles al hacer clic o usar el teclado
    tarjeta.addEventListener("click", () => {
        abrirDetalles(practica);
    });

    tarjeta.addEventListener("keydown", (evento) => {
        if (evento.key === "Enter" || evento.key === " ") {
            evento.preventDefault();
            abrirDetalles(practica);
        }
    });

    return tarjeta;
}

/* =========================================
   BUSCAR Y FILTRAR PRÁCTICAS
   ========================================= */

function mostrarPracticas() {
    const texto = buscarPractica.value
        .trim()
        .toLocaleLowerCase("es");

    const filtradas = practicas.filter((practica) => {
        const contenidoBusqueda = [
            practica.numero,
            practica.titulo,
            practica.descripcion,
            practica.categoria,
            practica.etiqueta,
            ...(practica.tecnologias || [])
        ]
            .join(" ")
            .toLocaleLowerCase("es");

        const coincideTexto = contenidoBusqueda.includes(texto);

        const coincideFiltro =
            filtroActual === "todas" ||
            practica.categoria === filtroActual;

        return coincideTexto && coincideFiltro;
    });

    listaPracticas.replaceChildren();

    if (filtradas.length === 0) {
        const vacio = document.createElement("div");
        vacio.className = "empty-state";
        vacio.textContent =
            "NO SE ENCONTRARON PRÁCTICAS CON ESOS CRITERIOS.";

        listaPracticas.appendChild(vacio);
    } else {
        const fragmento = document.createDocumentFragment();

        filtradas.forEach((practica, indice) => {
            fragmento.appendChild(crearTarjeta(practica, indice));
        });

        listaPracticas.appendChild(fragmento);
    }

    resultados.textContent =
        `Mostrando ${filtradas.length} de ${practicas.length} actividades.`;
}

// Buscar mientras se escribe
buscarPractica.addEventListener("input", mostrarPracticas);

// Cambiar el filtro de categoría
botonesFiltro.forEach((boton) => {
    boton.setAttribute(
        "aria-pressed",
        String(boton.classList.contains("active"))
    );

    boton.addEventListener("click", () => {
        filtroActual = boton.dataset.filter;

        botonesFiltro.forEach((otroBoton) => {
            const activo = otroBoton === boton;

            otroBoton.classList.toggle("active", activo);
            otroBoton.setAttribute("aria-pressed", String(activo));
        });

        mostrarPracticas();
    });
});

/* =========================================
   VENTANA CON LOS DETALLES
   ========================================= */

function abrirDetalles(practica) {
    modalNumero.textContent = `MÓDULO ${practica.numero}`;
    modalTitulo.textContent = practica.titulo;
    modalDescripcion.textContent = practica.descripcion;

    modalCategoria.textContent =
        practica.etiqueta || practica.categoria;

    // Mostrar las tecnologías de la práctica
    const tecnologias = practica.tecnologias || [];

    if (tecnologias.length > 0) {
        modalCategoria.textContent +=
            " · " + tecnologias.join(" · ");
    }

    if (practica.enlace) {
        modalEstado.textContent = "Enlace disponible";

        modalEnlace.href = practica.enlace;
        modalEnlace.textContent = "ABRIR PRÁCTICA ↗";
        modalEnlace.hidden = false;
    } else {
        modalEstado.textContent = "Enlace pendiente";

        modalEnlace.removeAttribute("href");
        modalEnlace.hidden = true;
    }

    modal.hidden = false;
    document.body.style.overflow = "hidden";

    cerrarModalBtn.focus();
}

function cerrarModal() {
    modal.hidden = true;
    document.body.style.overflow = "";
}

cerrarModalBtn.addEventListener("click", cerrarModal);
cerrarFondo.addEventListener("click", cerrarModal);

document.addEventListener("keydown", (evento) => {
    if (evento.key === "Escape" && !modal.hidden) {
        cerrarModal();
    }
});

/* =========================================
   INICIAR EL SISTEMA
   ========================================= */

cargarPracticas();
