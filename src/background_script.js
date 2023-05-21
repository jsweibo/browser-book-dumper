let config = null;
let bookContentsUrl = '';
let savedChapterUrl = '';
let chapters = [];
let index = 0;
let finished = false;

let tabId = -1;
let workStatus = false;
let downloadUrl = '';
let downloadItemId = -1;

// contextMenus Id
let startId = -1;
let suspendId = -1;
let resumeId = -1;
let downloadId = -1;
let clearCacheId = -1;

function start() {
  chrome.storage.local.get(null, function (res) {
    if ('config' in res) {
      // sync
      config = res.config;

      if ('bookContentsUrl' in res) {
        bookContentsUrl = res.bookContentsUrl;
      }
      if ('savedChapterUrl' in res) {
        savedChapterUrl = res.savedChapterUrl;
      }
      if ('chapters' in res) {
        chapters = res.chapters;
      }
      if ('index' in res) {
        index = res.index;
      }
      if ('finished' in res) {
        finished = res.finished;
      }

      // remove old context menus
      chrome.contextMenus.removeAll(function () {
        initContextMenus();
      });
    } else {
      // writing settings will invoke chrome.storage.onChanged
      chrome.storage.local.set({
        config: DEFAULT_SETTINGS,
      });
    }
  });
}

function systemNotify(message) {
  chrome.notifications.create({
    type: 'basic',
    iconUrl: 'icons/icon.png',
    title: 'Book Dumper',
    message: message,
  });
}

function getStatus() {
  console.log({
    config: config,
    bookContentsUrl: bookContentsUrl,
    savedChapterUrl: savedChapterUrl,
    index: index,
    finished: finished,

    tabId: tabId,
    workStatus: workStatus,
  });
}

function clearCache() {
  bookContentsUrl = '';
  savedChapterUrl = '';
  chapters = [];
  index = 0;

  tabId = -1;
  workStatus = false;

  chrome.storage.local.clear(function () {
    chrome.storage.local.set({
      config: config,
    });
  });
}

function initContextMenus() {
  startId = chrome.contextMenus.create({
    title: 'Start',
    onclick(info, tab) {
      // prevent duplicate clicks
      chrome.contextMenus.update(startId, {
        enabled: false,
      });

      chrome.tabs.sendMessage(
        tab.id,
        {
          action: 'start',
          config: config,
        },
        function (message) {
          if (message) {
            chrome.tabs.create(
              {
                active: false,
              },
              function (tab) {
                index = config.firstChapterIndex;
                tabId = tab.id;
                workStatus = true;
                updateContextMenus();
                updateTab();
              }
            );
          }
        }
      );
    },
  });

  suspendId = chrome.contextMenus.create({
    title: 'Suspend',
    onclick() {
      // prevent duplicate clicks
      chrome.contextMenus.update(suspendId, {
        enabled: false,
      });

      workStatus = false;
    },
  });

  resumeId = chrome.contextMenus.create({
    title: 'Resume',
    onclick() {
      // prevent duplicate clicks
      chrome.contextMenus.update(resumeId, {
        enabled: false,
      });

      if (config.dumpMode === 1) {
        if (tabId !== -1) {
          workStatus = true;
          updateContextMenus();
          updateTab();
        } else {
          chrome.tabs.create(
            {
              active: false,
            },
            function (tab) {
              tabId = tab.id;
              workStatus = true;
              updateContextMenus();
              updateTab();
            }
          );
        }
      } else {
        if (tabId !== -1) {
          chrome.tabs.update(
            tabId,
            {
              url: savedChapterUrl,
            },
            function () {
              workStatus = true;
              updateContextMenus();
            }
          );
        } else {
          chrome.tabs.create(
            {
              active: false,
              url: savedChapterUrl,
            },
            function (tab) {
              tabId = tab.id;
              workStatus = true;
              updateContextMenus();
            }
          );
        }
      }
    },
  });

  chrome.contextMenus.create({
    title: 'GetStatus',
    onclick() {
      getStatus();
    },
  });

  downloadId = chrome.contextMenus.create({
    title: 'Download',
    onclick() {
      downloadFile();
    },
  });

  clearCacheId = chrome.contextMenus.create({
    title: 'ClearCache',
    onclick() {
      // prevent duplicate clicks
      chrome.contextMenus.update(clearCacheId, {
        enabled: false,
      });

      clearCache();
    },
  });

  updateContextMenus();
}

function updateContextMenus() {
  chrome.contextMenus.update(startId, {
    enabled: !!config && !chapters.length,
  });
  chrome.contextMenus.update(suspendId, {
    enabled: workStatus,
  });

  chrome.contextMenus.update(resumeId, {
    enabled: !workStatus && !!chapters.length && !finished,
  });

  chrome.contextMenus.update(downloadId, {
    enabled:
      !workStatus && !!chapters.length && !!(index - config.firstChapterIndex),
  });
  chrome.contextMenus.update(clearCacheId, {
    enabled: !workStatus && !!chapters.length,
  });
}

function suspend() {
  if (workStatus) {
    systemNotify('Suspend');
  }
  workStatus = false;
  updateContextMenus();
}

function finish() {
  chrome.storage.local.set(
    {
      finished: true,
    },
    function () {
      tabId = -1;
      workStatus = false;
      updateContextMenus();
      systemNotify('Finish');
    }
  );
}

function downloadFile() {
  chrome.storage.local.get(null, function (res) {
    if (res.length) {
      downloadUrl = URL.createObjectURL(
        new Blob(Array.from(res), {
          type: 'text/plain',
        })
      );
      chrome.downloads.download(
        {
          url: downloadUrl,
          filename: config.downloadFileName,
          saveAs: true,
        },
        function (id) {
          downloadItemId = id;
        }
      );
    } else {
      systemNotify('The cache is empty');
    }
  });
}

function updateTab() {
  if (index < chapters.length) {
    // next
    const requestUrl = chapters[index];
    if (requestUrl) {
      chrome.tabs.update(tabId, {
        url: requestUrl,
      });
    } else {
      systemNotify('Error: requestUrl is undefined');
    }
  } else {
    // finish
    finish();
  }
}

chrome.browserAction.onClicked.addListener(function () {
  chrome.runtime.openOptionsPage();
});

chrome.tabs.onRemoved.addListener(function (id) {
  if (id === tabId) {
    tabId = -1;
    // suspend
    suspend();
  }
});

chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
  if (message.eventType === 'query') {
    if (sender.tab.id === tabId) {
      // on
      if (config.dumpMode === 1) {
        sendResponse({
          dump: true,
          config: config,
          index: index,
        });
      } else {
        if (sender.tab.url === bookContentsUrl) {
          // finish
          finish();
        } else if (sender.tab.url === savedChapterUrl) {
          // next
          sendResponse({
            dump: false,
            next: true,
            config: config,
          });
        } else {
          sendResponse({
            dump: true,
            config: config,
            index: index,
          });
        }
      }
    } else {
      // off
      sendResponse({
        dump: false,
      });
    }
  } else if (message.eventType === 'next') {
    if (workStatus) {
      if (config.dumpMode === 1) {
        updateTab();
      } else {
        sendResponse({});
      }
    } else {
      // suspend
      systemNotify('Suspend');
      suspend();
    }
  } else if (message.eventType === 'error') {
    workStatus = false;
    updateContextMenus();
    systemNotify(`Error: ${message.event}`);
  }

  return true;
});

chrome.downloads.onChanged.addListener(function (downloadDelta) {
  if (downloadDelta.id === downloadItemId) {
    if (downloadDelta.state) {
      if (
        downloadDelta.state.current === 'complete' ||
        downloadDelta.state.current === 'interrupted'
      ) {
        URL.revokeObjectURL(downloadUrl);
        downloadUrl = '';
        downloadItemId = -1;
      }
    }
  }
});

chrome.storage.onChanged.addListener(function () {
  // restart
  start();
});

// start
start();
