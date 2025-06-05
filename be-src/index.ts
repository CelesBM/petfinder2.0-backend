import express from "express";
import { sequelize } from "./models/connection";
import "./models/connection"; // o donde tengas la conexión
import { Request, Response } from "express";
import * as dotenv from "dotenv";
import cors from "cors";
import * as path from "path";
import sgMail from "@sendgrid/mail";

import {
  authUser,
  authToken,
  authMiddleware,
  getUser,
  loginUser,
  getAllUsers,
} from "./controllers/auth-controller";
import { updateUserData } from "./controllers/users-controller";
import {
  createReport,
  getAllPets,
  updateReport,
  deletePet,
  nearbyPets,
  reportPet,
} from "./controllers/pet-controllers";

dotenv.config();
sgMail.setApiKey(process.env.SENDGRID_API_KEY as string);

const app = express();
const port = 3000;
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

//Middleware para agregar los encabezados necesarios en las respuestas HTTP, para permitir solicitudes entre diferentes dominios:
app.use(
  cors({
    origin: [
      "http://localhost:3000", // local backend
      "http://localhost:5174", // local frontend
      "https://petfinder-d943d.web.app", // frontend deployado en Firebase
    ],
    methods: "GET, POST, PUT, DELETE, OPTIONS",
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

console.log("En index.ts - SEQUELIZE_URL:", process.env.SEQUELIZE_URL);

//sequelize.sync({ alter: true }).then(() => {
//  console.log("Base de datos sincronizada");
//app.listen(port, () => {
//  console.log("Listening on port", port);
//});
//});

app.get("/users", getAllUsers);

//Crear nuevo usuario:
app.post("/auth", async (req, res) => {
  try {
    if (req.body) {
      const user = await authUser(req.body);
      if (typeof user === "string") {
        res.status(400).json({ error: user });
      }
      res.json(user);
    } else {
      res.status(400).json({ error: "Error de userData en auth-controller." });
    }
  } catch (err) {
    res.status(500).json({ error: "Error interno del servidor." });
  }
});

//Crear token de nuevo usuario:

app.post("/auth/token", async (req, res): Promise<void> => {
  if (!req.body) {
    res.status(400).json({ error: "No se ingresaron datos al body." });
  }

  try {
    const tokenResponse = await authToken(req.body);

    // Verificación segura para errores
    if ("error" in tokenResponse) {
      res.status(400).json({ error: tokenResponse.error });
    }

    res.json({
      token: tokenResponse.token,
      user: tokenResponse.user,
    });
  } catch (error) {
    res.status(500).json({ error: "Error al generar el token." });
  }
});

app.use(
  "/me",
  authMiddleware,
  (req: Request & { userauth?: any }, res: Response) => {
    if (req.userauth) {
      res.json({ user: req.userauth });
    } else {
      res.status(401).json({ error: "No autorizado." });
    }
  }
);

app.use(
  "/me",
  authMiddleware,
  (req: Request & { userauth?: any }, res: Response) => {
    if (req.userauth) {
      res.json({ user: req.userauth });
    } else {
      res.status(401).json({ error: "No autorizado." });
    }
  }
);

//Obtengo usuario:
app.post("/me", async (req, res) => {
  try {
    const userFound = await getUser(req);
    res.json(userFound);
  } catch (error) {
    res.status(400).json(error);
  }
});

//Inicio de sesión:
app.post("/login", async (req: Request, res: Response) => {
  if (req.body.email) {
    const user = await loginUser(req.body);
    res.json(user);
  } else {
    res.status(400).json("No se ingresaron datos al body.");
  }
});

//Actualización datos personales:
app.post("/update-personal", async (req, res) => {
  console.log("Cuerpo recibido en el backend:", req.body);
  try {
    if (req.body.userId) {
      const updatedUser = await updateUserData(req.body);
      res.json(updatedUser);
    } else {
      res.status(400).json({ error: "No se registra userId." });
    }
  } catch (error) {
    res.status(500).json({ error: "Error interno del servidor." });
  }
});

//Crear nuevo reporte:
app.post("/create-report", async (req, res) => {
  if (req.body.userId) {
    const newReport = await createReport(req.body);
    res.json(newReport);
  } else {
    res.status(400).json("Faltan datos.");
  }
});

//Obtener mis pets reportadas:
app.get("/pets", async (req, res) => {
  const userId = parseInt(req.query.userId as string, 10);
  if (req.query.userId) {
    const myPets = await getAllPets(req, userId);
    res.json(myPets);
  } else {
    res.status(400).json("Query inválida.");
  }
});

//Editar mi reporte:
app.post("/edit-report", async (req, res) => {
  if (req.body.id) {
    const petUpdated = await updateReport(req.body);
    console.log(petUpdated);
    res.json(petUpdated);
  } else {
    res.status(400).json("Falta id de mascota.");
  }
});

//Eliminar mi reporte:
app.post("/delete-report", async (req, res) => {
  if (req.body.id) {
    const pet = await deletePet(req.body.id);
    res.status(200).json("Mascota eliminada correctamente.");
  } else {
    res.status(400).json("Falta id de mascota.");
  }
});

//Mascotas cercanas:
app.get("/nearby-pets", async (req, res) => {
  if (req.query.lng && req.query.lat) {
    const response = await nearbyPets(req);
    res.json(response);
  } else {
    res.status(400).json("Faltan datos.");
  }
});

//Reportar mascota cercana:
app.post("/report-pet", async (req, res) => {
  if (req.body.id) {
    const report = await reportPet(req.body, req.body.id);
    res.json(report);
  } else {
    res.status(400).json("Falta id de mascota.");
  }
});

//Enviar mail:
app.post("/send-email", async (req, res) => {
  const { email, reportName, reportPhone, reportAbout } = req.body;
  const msg = {
    to: email,
    from: "celestemonterodev@gmail.com",
    subject: "Petfinder: han visto a tu mascota!",
    text: `Vió a tu mascota: ${reportName}\nTeléfono: ${reportPhone}\nInformación sobre tu mascota: ${reportAbout}`,
  };

  try {
    await sgMail.send(msg);
    console.log("📬 Endpoint /send-email fue llamado.");
    res.status(200).send({ message: "Correo enviado exitosamente." });
  } catch (error) {
    console.error("Error al enviar el correo:", error);
    const err = error as any;
    res.status(500).send({
      error: "Error al enviar el correo.",
      details: err?.response?.body?.errors || "No hay detalles disponibles.",
    });
  }
});

app.listen(port, () => {
  console.log("Listening on port", port);
});

/*const staticDirPath = path.resolve(__dirname, "../dist");
app.use(express.static(staticDirPath)); //configuración Express para servir archivos estáticos
app.get("*", (req, res) => {
  res.sendFile(path.join(staticDirPath, "index.html")); //responde con el archivo `index.html` solo para las rutas que no sean de recursos estáticos
});
*/
