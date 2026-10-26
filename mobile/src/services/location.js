import * as Location from 'expo-location';

// Текущая геопозиция для отметки или null, если доступа нет или её не удалось получить.
// Без геопозиции отметка всё равно учитывается сервером, но без баллов.
export async function getCurrentLocation() {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return null;
    const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
    return { lat: pos.coords.latitude, lon: pos.coords.longitude };
  } catch (e) {
    return null;
  }
}
