export const setDataInLocalStorage = (key: string, value: any) => {
  localStorage.setItem(key, JSON.stringify(value));
};

export const getDataFromLocalStorage = (key: string) => {
  return JSON.parse(localStorage.getItem(key) || "{}");
};

export const removeDataFromLocalStorage = (key: string) => {
  localStorage.removeItem(key);
};

export const removeAllDataFromLocalStorage = () => {
  localStorage.clear();
};

export const getAllUserInfoFromLocalStorage = () => {
  const userInfo = getDataFromLocalStorage("user");
  return userInfo;
};
