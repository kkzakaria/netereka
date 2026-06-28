import { Composition } from "remotion";
import { DeliveryBannerAbidjan } from "./DeliveryBannerAbidjan";

// The reference strip is 1600×202. We loop at 6s / 30fps = 180 frames.
export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="DeliveryBannerAbidjan"
      component={DeliveryBannerAbidjan}
      durationInFrames={180}
      fps={30}
      width={1600}
      height={202}
    />
  );
};
