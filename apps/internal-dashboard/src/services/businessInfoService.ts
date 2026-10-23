import { simulateRequest } from "./simulate";
import { businessInfoByClientId, emptyBusinessInfo, type ClientBusinessInfo } from "./businessInfoSeed";

export const businessInfoService = {
  getForClient(clientId: string): Promise<ClientBusinessInfo> {
    return simulateRequest(() => businessInfoByClientId[clientId] ?? { ...emptyBusinessInfo, businessProfile: { ...emptyBusinessInfo.businessProfile, clientId } });
  },
};
