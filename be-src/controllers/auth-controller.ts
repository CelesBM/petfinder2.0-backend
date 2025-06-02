import { Request, Response, NextFunction } from "express";
import * as crypto from "crypto";
import * as jwt from "jsonwebtoken";
import { Auth } from "../models/auth";
import { User } from "../models/users";
import { userDataAlgolia } from "../models/connection";
import * as dotenv from "dotenv";
dotenv.config();

type UserData = {
  fullname: string;
  email: string;
  password: string;
  localidad: string;
};

type AuthData = {
  email: string;
  password: string;
};

type TokenResponse =
  | {
      token: string;
      user: {
        id: number;
        fullname: string | null;
        email: string;
        localidad: string | null;
        userLat: number | null;
        userLong: number | null;
      };
    }
  | { error: string };

const secretCrypto = process.env.SECRET_CRYPTO;

//Función para encriptamiento de contraseña, para un almacenamiento seguro:
function getSHA256fromSTRING(text: string) {
  return crypto.createHash("sha256").update(text).digest("hex");
}

//Funcion para crear un nuevo usuario:
export async function authUser(userData: UserData) {
  const { fullname, email, password, localidad } = userData;
  const existingUser = await User.findOne({ where: { email } }); //verifica si el usuario ya existe

  if (existingUser) {
    return "Este usuario ya está registrado, dirigirse a Iniciar Sesión.";
  }

  //Creo usuario:
  const [user, created] = await User.findOrCreate({
    where: { email },
    defaults: {
      fullname,
      email,
      password: getSHA256fromSTRING(password),
    },
  });

  const [auth, authCreated] = await Auth.findOrCreate({
    where: { userId: user.get("id") },
    defaults: {
      email,
      password: getSHA256fromSTRING(password),
      userId: user.get("id"),
    },
  });

  //Guardar usuario en Algolia si fue creado exitosamente:
  if (created) {
    const algoliaResponse = await userDataAlgolia.saveObject({
      objectID: user.get("id"),
      fullname,
      email,
      localidad,
    });

    return user; //usuario creado
  } else {
    return user; //usuario encontrado
  }
}

//Función para iniciar sesión y generación de token para autenticación:
export async function authToken(dataAuth: AuthData) {
  const { email, password } = dataAuth;

  const auth = await Auth.findOne({ where: { email } });

  if (!auth) {
    return { error: "Usuario no registrado." };
  }

  const authPassword = auth.get("password");

  if (authPassword !== getSHA256fromSTRING(password)) {
    return { error: "Contraseña incorrecta." };
  }

  const user = await User.findOne({ where: { id: auth.get("userId") } });

  if (!user) {
    return { error: "No se encontró el usuario." };
  }

  const userData = {
    id: user.get("id") as number,
    fullname: user.get("fullname") as string | null,
    email: user.get("email") as string,
    localidad: user.get("localidad") as string | null,
    userLat: user.get("userLat") as number | null,
    userLong: user.get("userLong") as number | null,
  };

  const token = jwt.sign({ user: userData }, secretCrypto as string);

  return { token, user: userData };
}

//Función middleware para autenticación del token:
export function authMiddleware(
  req: Request & { userauth?: any },
  res: Response,
  next: NextFunction
): void {
  const authHeader = req.get("Authorization"); //obtener el header "Authorization" para hacer las peticiones

  if (!authHeader || !authHeader.startsWith("bearer ")) {
    res
      .status(401)
      .json({ error: "No autorizado. Falta token o formato incorrecto." }); //el token comienza con bearer y n° token
    return;
  }

  const token = authHeader.split(" ")[1]; //obtengo la posición del n° token (excluyendo bearer)
  try {
    const data = jwt.verify(token, secretCrypto as any) as any; //verificación del token
    req.userauth = data.user; //guarda los datos decodificados del token
    next(); //pasa el control al siguiente middleware
  } catch (error) {
    res.status(401).json({ error: "Token inválido o expirado." });
  }
}

//Función para obtener al user:
export async function getUser(request: Request & { user?: any }) {
  if (request.user) {
    const id = request.user.id;

    const userFound = await User.findOne({
      where: { id },
    });
    return userFound;
  } else {
    throw new Error("Error: no hay datos en request.user");
  }
}

export async function getAllUsers(req: Request, res: Response) {
  try {
    const users = await User.findAll();
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: "Error al obtener los usuarios." });
  }
}

//Función para iniciar sesión:
export async function loginUser(dataAuth: AuthData) {
  const { email, password } = dataAuth;

  if (!email || !password) {
    throw new Error("Faltan datos: email o password.");
  }

  const auth = await Auth.findOne({ where: { email } }); //buscar usuario en la tabla Auth
  if (!auth) {
    throw new Error("Usuario no registrado.");
  }

  const hashedPassword = getSHA256fromSTRING(password);
  if (auth.get("password") !== hashedPassword) {
    throw new Error("Contraseña incorrecta."); //verificar la contraseña
  }

  //Buscar datos del usuario en la tabla User:
  const user = await User.findOne({ where: { id: auth.get("userId") } });
  if (!user) {
    throw new Error("No se encontró el usuario asociado.");
  }

  return {
    message: "Autenticación exitosa.",
    user: {
      id: user.get("id"),
      fullname: user.get("fullname"),
      email: user.get("email"),
    },
  };
}
