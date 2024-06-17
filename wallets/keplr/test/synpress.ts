import { testWithSynpress } from "@synthetixio/synpress-core";
import { keplrFixtures } from "../src";
import connectedSetup from "./wallet-setup/connected-keplr.setup";

export default testWithSynpress(keplrFixtures(connectedSetup))
