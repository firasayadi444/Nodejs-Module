export function canAccessHive(user, hive) {
  return user.role === "admin" || user.role === "gestionnaire"
    || (user.role === "coordinateur" && user.site_id === hive.site_id)
    || (user.role === "apiculteur" && user.sub === hive.owner_id);
}
