export function fetchUser(id) {
  return new Promise((resolve, reject) => {
    if (!id) return reject(new Error("id required"));
    setTimeout(() => resolve({ id, name: "User " + id }), 10);
  });
}

export async function fetchUsers(ids) {
  return Promise.all(ids.map(fetchUser));
}
