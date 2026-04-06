import * as Network from "expo-network";
import { useEffect, useState } from "react";

export interface NetworkInfo {
  type: string;
  isConnected: boolean;
  isWifi: boolean;
  isCellular: boolean;
  ssid?: string;
  ip?: string;
}

export function useNetworkInfo() {
  const [networkInfo, setNetworkInfo] = useState<NetworkInfo>({
    type: "Unknown",
    isConnected: false,
    isWifi: false,
    isCellular: false,
  });

  const fetchNetworkInfo = async () => {
    try {
      // Получаем состояние сети
      const networkState = await Network.getNetworkStateAsync();

      const isConnected =
        networkState.isConnected && !networkState.isInternetReachable === false;
      const isWifi = networkState.type === Network.NetworkStateType.WIFI;
      const isCellular =
        networkState.type === Network.NetworkStateType.CELLULAR;

      let ssid: string | undefined;
      let ip: string | undefined;

      // Получаем IP адрес
      try {
        const ipAddress = await Network.getIpAddressAsync();
        ip = ipAddress;
      } catch (e) {
        // Не удалось получить IP
      }

      // Получаем SSID для WiFi
      if (isWifi) {
        try {
          // В expo-network 7+ SSID можно получить через getCurrentConnectivityAsync
          // или через нативные модули, но для простоты оставим без SSID
          ssid = undefined;
        } catch (e) {
          // Не удалось получить WiFi информацию
        }
      }

      setNetworkInfo({
        type: isWifi
          ? "WiFi"
          : isCellular
            ? "Мобильный интернет"
            : networkState.type || "Unknown",
        isConnected: networkState.isConnected || false,
        isWifi,
        isCellular,
        ssid,
        ip,
      });
    } catch (error) {
      console.error("Error fetching network info:", error);
      setNetworkInfo({
        type: "Error",
        isConnected: false,
        isWifi: false,
        isCellular: false,
      });
    }
  };

  useEffect(() => {
    fetchNetworkInfo();

    // Обновляем информацию каждые 5 секунд
    const interval = setInterval(fetchNetworkInfo, 5000);

    return () => clearInterval(interval);
  }, []);

  return networkInfo;
}
