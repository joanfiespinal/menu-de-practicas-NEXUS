
require("dotenv").config();

const express = require("express");
const session = require("express-session");
const bcrypt = require("bcryptjs");
const initSqlJs = require("sql.js");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

const CARPETA = __dirname;
const ARCHIVO_DB = path.join(CARPETA, "nexus.db");

if (!process.env.SESSION_SECRET ||
    !process.env.ADMIN_USER ||
    !process.env.ADMIN_PASSWORD) {
    console.error(
        "Faltan SESSION_SECRET, ADMIN_USER o ADMIN_PASSWORD en el archivo .env"
    );
    process.exit(1);
}

app.disable("x-powered-by");
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

app.use(session({
    name: "nexus.sid",
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        maxAge: 30 * 60 * 1000
    }
}));

let db;

function guardarBaseDatos() {
    fs.writeFileSync(ARCHIVO_DB, Buffer.from(db.export()));
}

function buscarUsuario(usuario) {
    const resultado = db.exec(
        "SELECT id, usuario, password_hash FROM usuarios WHERE usuario = ?",
        [usuario]
    );

    if (!resultado.length || !resultado[0].values.length) {
        return null;
    }

    const fila = resultado[0].values[0];

    return {
        id: fila[0],
        usuario: fila[1],
        password_hash: fila[2]
    };
}

function requiereSesion(req, res, next) {
    if (!req.session.usuario) {
        return res.redirect("/login.html");
    }

    next();
}

function enviarArchivo(res, nombre) {
    res.sendFile(path.join(CARPETA, nombre));
}

async function iniciarServidor() {
    const SQL = await initSqlJs();

    if (fs.existsSync(ARCHIVO_DB)) {
        db = new SQL.Database(
            new Uint8Array(fs.readFileSync(ARCHIVO_DB))
        );
    } else {
        db = new SQL.Database();
    }

    db.run(`
        CREATE TABLE IF NOT EXISTS usuarios (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            usuario TEXT NOT NULL UNIQUE,
            password_hash TEXT NOT NULL,
            creado_en TEXT DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Crear el usuario inicial si todavía no existe.
    const usuarioInicial = process.env.ADMIN_USER;
    const passwordInicial = process.env.ADMIN_PASSWORD;

    if (!buscarUsuario(usuarioInicial)) {
        const hash = await bcrypt.hash(passwordInicial, 12);

        db.run(
            "INSERT INTO usuarios (usuario, password_hash) VALUES (?, ?)",
            [usuarioInicial, hash]
        );

        guardarBaseDatos();
        console.log("Usuario inicial creado correctamente.");
    }

    // Pantalla pública de inicio de sesión.
    app.get("/login.html", (req, res) => {
        if (req.session.usuario) {
            return res.redirect("/");
        }

        enviarArchivo(res, "login.html");
    });

    // CSS público para que el login pueda conservar su diseño.
    app.get("/style.css", (req, res) => {
        enviarArchivo(res, "style.css");
    });

    // Validar las credenciales en el servidor.
    app.post("/api/login", async (req, res, next) => {
        try {
            const usuario = String(req.body.usuario || "").trim();
            const contrasena = String(req.body.contrasena || "");

            if (!usuario || !contrasena) {
                return res.status(400).json({
                    mensaje: "Introduce el usuario y la contraseña."
                });
            }

            const registro = buscarUsuario(usuario);

            const valido = registro
                ? await bcrypt.compare(
                    contrasena,
                    registro.password_hash
                )
                : false;

            if (!valido) {
                return res.status(401).json({
                    mensaje: "Usuario o contraseña incorrectos."
                });
            }

            req.session.regenerate((error) => {
                if (error) return next(error);

                req.session.usuario = {
                    id: registro.id,
                    nombre: registro.usuario
                };

                req.session.save((errorGuardar) => {
                    if (errorGuardar) return next(errorGuardar);

                    res.json({
                        mensaje: "Acceso autorizado.",
                        redireccion: "/"
                    });
                });
            });
        } catch (error) {
            next(error);
        }
    });

    // Cerrar sesión.
    app.post("/api/logout", requiereSesion, (req, res, next) => {
        req.session.destroy((error) => {
            if (error) return next(error);

            res.clearCookie("nexus.sid");
            res.json({ redireccion: "/login.html" });
        });
    });

    // Proteger el menú principal.
    app.get("/", requiereSesion, (req, res) => {
        enviarArchivo(res, "index.html");
    });

    app.get("/index.html", requiereSesion, (req, res) => {
        enviarArchivo(res, "index.html");
    });

    // Los datos y el JavaScript del menú requieren sesión.
    app.get("/menu.js", requiereSesion, (req, res) => {
        enviarArchivo(res, "menu.js");
    });

    app.get("/menu.json", requiereSesion, (req, res) => {
        enviarArchivo(res, "menu.json");
    });

    // Respuesta controlada para errores del servidor.
    app.use((error, req, res, next) => {
        console.error("Error del servidor:", error.message);

        if (res.headersSent) return next(error);

        res.status(500).json({
            mensaje: "Ocurrió un error interno del servidor."
        });
    });

    app.listen(PORT, () => {
        console.log(`NEXUS está disponible en http://localhost:${PORT}`);
    });
}

iniciarServidor().catch((error) => {
    console.error("No se pudo iniciar NEXUS:", error.message);
    process.exit(1);
});
