function getRandomInt(a, b) {
  return Math.floor(Math.random() * (b - a + 1)) + a;
}

// for book-contents
chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
  if (message.action === 'start') {
    try {
      const bookContents = document.querySelectorAll(
        message.config.bookContentsSelector
      );
      if (bookContents) {
        let chapters = Array.prototype.map.call(bookContents, function (item) {
          return item.href;
        });
        if (message.config.orderMode !== 1) {
          chapters.reverse();
        }
        if (chapters.length) {
          chrome.storage.local.set(
            {
              bookContentsUrl: location.href,
              chapters: chapters,
            },
            function () {
              sendResponse({});
            }
          );
        } else {
          throw new Error('Book chapters is null: ' + location.href);
        }
      } else {
        throw new Error('Book contents is null: ' + location.href);
      }
    } catch (error) {
      chrome.runtime.sendMessage({
        eventType: 'error',
        event: error,
      });
    }
  }

  return true;
});

// for each chapter
chrome.runtime.sendMessage(
  {
    eventType: 'query',
  },
  function (message) {
    if (message) {
      if (message.dump) {
        setTimeout(function () {
          try {
            let nextChapterButton = null;
            if (message.config.dumpMode !== 1) {
              nextChapterButton = document.querySelector(
                message.config.nextChapterButtonSelector
              );
              if (!nextChapterButton) {
                throw new Error(
                  'Next chapter button is null: ' + location.href
                );
              }
            }

            for (let selector of message.config.removeElementsFromChapter) {
              for (let item of document.querySelectorAll(selector)) {
                item.remove();
              }
            }

            const chapterData = [];

            const title = document.querySelector(
              message.config.chapterTitleSelector
            );
            if (title) {
              const titleText = title.innerText;
              if (titleText) {
                chapterData.push(titleText + '\n');
              } else {
                throw new Error('Chapter title is null: ' + location.href);
              }
            } else {
              throw new Error('Chapter title is null: ' + location.href);
            }

            const content = document.querySelector(
              message.config.chapterContentSelector
            );
            if (content) {
              const contentText = content.innerText.replace(/\n+/g, '\n');
              if (contentText) {
                chapterData.push(contentText);
              } else {
                throw new Error('Chapter content is null: ' + location.href);
              }
            } else {
              throw new Error('Chapter content is null: ' + location.href);
            }

            if (chapterData.length) {
              const nextIndex = message.index + 1;
              const savedData = {
                [message.index - message.config.firstChapterIndex]:
                  chapterData.join('\n') + '\n\n',
                index: nextIndex,
                length: nextIndex - message.config.firstChapterIndex,
                savedChapterUrl: location.href,
              };

              chrome.storage.local.set(savedData, function () {
                console.log('Done: ' + location.href);

                setTimeout(function () {
                  chrome.runtime.sendMessage(
                    {
                      eventType: 'next',
                    },
                    function (message) {
                      if (message) {
                        // config.dumpMode !== 1
                        nextChapterButton.click();
                      }
                    }
                  );
                }, getRandomInt(
                  message.config.shortestCD,
                  message.config.longestCD
                ) * 1e3);
              });
            } else {
              throw new Error('Chapter HTML is null: ' + location.href);
            }
          } catch (error) {
            chrome.runtime.sendMessage({
              eventType: 'error',
              event: error,
            });
          }
        }, message.config.chapterRenderTime * 1e3);
      } else if (message.next) {
        // config.dumpMode !== 1
        setTimeout(function () {
          try {
            const nextChapterButton = document.querySelector(
              message.config.nextChapterButtonSelector
            );
            if (!nextChapterButton) {
              throw new Error('Next chapter button is null: ' + location.href);
            } else {
              nextChapterButton.click();
            }
          } catch (error) {
            chrome.runtime.sendMessage({
              eventType: 'error',
              event: error,
            });
          }
        }, message.config.chapterRenderTime * 1e3);
      }
    }
  }
);
