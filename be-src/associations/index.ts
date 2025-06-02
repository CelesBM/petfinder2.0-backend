import { User } from "../models/users";
import { Pet } from "../models/pets";
import { Report } from "../models/report";

User.hasMany(Pet);
Pet.hasMany(Report);
Pet.belongsTo(User);

export { User, Pet, Report };
