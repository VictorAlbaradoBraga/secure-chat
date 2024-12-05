// Middleware de autenticação
function authenticateUser(req, res, next) {
    const token = req.headers["authorization"]?.split(" ")[1]; // "Bearer <token>"
    if (!token) {
      console.log("Erro: sem token");
      return res.sendStatus(400); // Bad Request
    }
  
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, user) => {
      if (err) {
        console.log(err);
        return res.sendStatus(403); // Forbidden
      }
      req.user = user;
      next();
    });
  }
  
  module.exports = {
    authenticateUser,
  };
  