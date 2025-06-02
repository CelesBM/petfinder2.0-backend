import { Model, DataTypes } from "sequelize";
import { sequelize } from "./connection";

export class User extends Model {}

User.init(
  {
    fullname: { type: DataTypes.STRING },
    email: { type: DataTypes.STRING },
    localidad: { type: DataTypes.STRING },
    userLat: { type: DataTypes.DECIMAL },
    userLong: { type: DataTypes.DECIMAL },
  },
  { sequelize, modelName: "user" }
);
