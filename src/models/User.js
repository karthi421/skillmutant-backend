const User = sequelize.define(
  "User",
  {
   
    email: { type: DataTypes.STRING, unique: true },
    password: DataTypes.STRING,
    role: DataTypes.STRING,
    address: DataTypes.TEXT,
    provider: DataTypes.STRING,
    username: { type: String, unique: true },
password: { type: String }, // hashed
googleId: { type: String },
isProfileComplete: { type: Boolean, default: false }

  },
  {
    tableName: "users_skill",
    timestamps: false,
  }
);

module.exports = User;
