const { join } = require("path");
const {
  existsSync,
  readdirSync,
  readFileSync,
  writeFileSync,
  removeSync,
} = require("fs-extra");
const findCacheDir = require("find-cache-dir");
const { NETLIFY_PUBLISH_PATH, NETLIFY_FUNCTIONS_PATH } = require("../config");

const TRACKING_FILE_SEPARATOR = "---";

// Clean configured publish and functions folders and track next-on-netlify files
// for future cleans
const handleFileTracking = ({ functionsPath, publishPath }) => {
  const isConfiguredFunctionsDir = functionsPath !== NETLIFY_FUNCTIONS_PATH;
  const isConfiguredPublishDir = publishPath !== NETLIFY_PUBLISH_PATH;

  const cacheDir = findCacheDir({ name: "next-on-netlify", create: true });
  const trackingFilePath = join(cacheDir, ".nonfiletracking");

  if (existsSync(trackingFilePath)) {
    const trackingFile = readFileSync(trackingFilePath, "utf8");
    const [trackedFunctions, trackedPublish] = trackingFile.split(
      TRACKING_FILE_SEPARATOR
    );

    const cleanConfiguredFiles = (trackedFiles) => {
      trackedFiles.forEach((file) => {
        const filePath = join(publishPath, file);
        if (file !== "" && existsSync(filePath)) {
          removeSync(filePath);
        }
      });
    };

    if (isConfiguredPublishDir) {
      cleanConfiguredFiles(trackedPublish.split("\n"));
    }
    if (isConfiguredFunctionsDir) {
      cleanConfiguredFiles(trackedFunctions.split("\n"));
    }
  }

  const functionsBeforeRun = existsSync(functionsPath)
    ? readdirSync(functionsPath)
    : [];
  const publishBeforeRun = existsSync(publishPath)
    ? readdirSync(publishPath)
    : [];

  // this callback will run at the end of nextOnNetlify()
  const trackNewFiles = () => {
    const functionsAfterRun = isConfiguredFunctionsDir
      ? readdirSync(functionsPath)
      : functionsBeforeRun;
    const publishAfterRun = isConfiguredPublishDir
      ? readdirSync(publishPath)
      : publishBeforeRun;
    const getDifference = (before, after) =>
      after.filter((filePath) => !before.includes(filePath));
    const newFunctionsFiles = getDifference(
      functionsBeforeRun,
      functionsAfterRun
    );
    const newPublishFiles = getDifference(publishBeforeRun, publishAfterRun);

    const allTrackedFiles = [
      ...newFunctionsFiles,
      TRACKING_FILE_SEPARATOR,
      ...newPublishFiles,
    ];
    writeFileSync(trackingFilePath, allTrackedFiles.join("\n"));
  };

  return trackNewFiles;
};

module.exports = handleFileTracking;
