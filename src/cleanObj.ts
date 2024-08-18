export function cleanObject<T extends object>(obj: T, recursive?: boolean) {
  const prevObj: any = obj;
  if (recursive) {
    let newObj: any = {};
    Object.keys(prevObj).forEach((key) => {
      if (prevObj[key] === Object(prevObj[key])) newObj[key] = cleanObject(prevObj[key], true);
      else if (prevObj[key] !== undefined) newObj[key] = prevObj[key];
    });
    return newObj as T;
  }
  
  let newObj: any = {...obj}
  Object.keys(prevObj).forEach(key => {
    if (newObj[key] === undefined) {
      delete newObj[key];
    }
  });
  return newObj as T;

}