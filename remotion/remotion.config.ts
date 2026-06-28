import { Config } from "@remotion/cli/config";

Config.setVideoImageFormat("png");
Config.setOverwriteOutput(true);
// Transparent background so the strip can be composited over any surface.
Config.setPixelFormat("yuva420p");
