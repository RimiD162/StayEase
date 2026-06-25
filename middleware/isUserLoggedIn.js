export default function isUserLoggedIn(req, res, next) {
  if (req.session && req.session.userId) {
    return next();
  }
  // Save the originally requested page to redirect back after login
  if (req.session) {
    req.session.redirectTo = req.originalUrl;
  }
  res.redirect("/user/login");
}
