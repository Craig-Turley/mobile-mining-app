import { Button } from '@/components/ui/button';
import { YoutubeMediaSource } from '@/features/video-player/lib/player-sources';
import {
  normalizeYoutubeCaptions,
  YoutubeCaptionEvent,
  YoutubeCaptions,
} from '@/lib/youtube-webview';
import { YoutubeWebviewEvent } from '@/lib/youtube-webview/events';
import { router, Stack } from 'expo-router';
import { useState } from 'react';
import { View, Text } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';

export default function YoutubeBrowserScreen() {
  const insets = useSafeAreaInsets();
  const [videoId, setVideoId] = useState<string | undefined>(undefined);
  const [captions, setCaptions] = useState<YoutubeCaptions | undefined>(undefined);

  return (
    <>
      <Stack.Screen
        options={{
          header: undefined,
          headerBackButtonDisplayMode: 'minimal',
          headerTitle: '',
        }}
      />
      <SafeAreaView className="relative flex-1" edges={['left', 'right', 'bottom']}>
        <WebView
          className="flex-1"
          allowsFullscreenVideo={false}
          allowsInlineMediaPlayback={true}
          source={{ uri: 'https://www.youtube.com' }}
          injectedJavaScriptBeforeContentLoaded={`
            (function () {
              if (window.__ytCaptionHookInstalled) {
                return true;
              }

              window.__ytCaptionHookInstalled = true;

              function post(payload) {
                try {
                  window.ReactNativeWebView.postMessage(
                    JSON.stringify(payload)
                  );
                } catch (e) {}
              }

              function parseUrl(url) {
                try {
                  const parsed = new URL(url, window.location.origin);

                  return {
                    url: parsed.toString(),
                    videoId: parsed.searchParams.get("v"),
                  };
                } catch {
                  return {
                    url: String(url),
                    videoId: null,
                  };
                }
              }

              function checkWatchUrl() {
                try {
                  const url = new URL(window.location.href);

                  const isWatchPage = url.pathname === "/watch";
                  const videoId = isWatchPage
                    ? url.searchParams.get("v")
                    : null;

                  post({
                    tag: "watch",
                    url: url.toString(),
                    videoId,
                  });
                } catch {
                  post({
                    tag: "reset",
                  });
                }
              }

              const originalPushState = history.pushState;

              history.pushState = function (...args) {
                const result = originalPushState.apply(this, args);

                checkWatchUrl();

                return result;
              };

              const originalReplaceState = history.replaceState;

              history.replaceState = function (...args) {
                const result = originalReplaceState.apply(this, args);

                checkWatchUrl();

                return result;
              };

              window.addEventListener(
                "popstate",
                checkWatchUrl
              );

              window.addEventListener(
                "yt-navigate-finish",
                checkWatchUrl
              );

              checkWatchUrl();

              function findField(obj, targetKey) {
                if (!obj || typeof obj !== "object") {
                  return null;
                }

                if (targetKey in obj) {
                  return obj[targetKey];
                }

                for (const key in obj) {
                  if (typeof obj[key] === "object") {
                    const result = findField(
                      obj[key],
                      targetKey
                    );

                    if (result !== null) {
                      return result;
                    }
                  }
                }

                return null;
              }

              function isWatchUrl(url) {
                return (
                  typeof url === "string" &&
                  url.includes("/watch")
                );
              }

              function isTimedTextUrl(url) {
                return (
                  typeof url === "string" &&
                  url.includes("/timedtext")
                );
              }

              function isMetaDataUrl(url) {
                return (
                  typeof url === "string" &&
                  url.includes("/get_watch")
                );
              }

              // --------------------
              // fetch
              // --------------------

              const originalFetch = window.fetch;

              if (originalFetch) {
                window.fetch = async function (...args) {
                  const input = args[0];

                  const url =
                    typeof input === "string"
                      ? input
                      : input && input.url
                        ? input.url
                        : null;

                  const response =
                    await originalFetch.apply(this, args);

                  if (
                    url &&
                    isTimedTextUrl(String(url))
                  ) {
                    try {
                      const clonedResponse =
                        response.clone();

                      const body =
                        await clonedResponse.text();

                      const parsed =
                        parseUrl(String(url));

                      post({
                        tag: "timedtext",
                        transport: "fetch",
                        url: parsed.url,
                        videoId: parsed.videoId,
                        contentType:
                          clonedResponse.headers.get(
                            "content-type"
                          ),
                        body,
                      });
                    } catch (error) {
                      post({
                        tag: "error",
                        transport: "fetch",
                        message: String(error),
                      });
                    }
                  }

                  return response;
                };
              }

              // --------------------
              // XMLHttpRequest
              // --------------------

              const originalOpen =
                XMLHttpRequest.prototype.open;

              XMLHttpRequest.prototype.open =
                function (
                  method,
                  url,
                  ...rest
                ) {
                  const requestUrl =
                    String(url);

                  if (
                    isTimedTextUrl(requestUrl)
                  ) {
                    const parsed =
                      parseUrl(requestUrl);

                    this.addEventListener(
                      "load",
                      function () {
                        try {
                          let body;

                          if (
                            this.responseType === "" ||
                            this.responseType === "text"
                          ) {
                            body =
                              this.responseText;
                          } else if (
                            this.responseType === "json"
                          ) {
                            body =
                              JSON.stringify(
                                this.response
                              );
                          } else {
                            body =
                              String(
                                this.response
                              );
                          }

                          post({
                            tag: "timedtext",
                            transport: "xhr",
                            url: parsed.url,
                            videoId:
                              parsed.videoId,
                            contentType:
                              this.getResponseHeader(
                                "content-type"
                              ),
                            body,
                          });
                        } catch (error) {
                          post({
                            tag: "error",
                            transport: "xhr",
                            message:
                              String(error),
                          });
                        }
                      }
                    );
                  }

                  return originalOpen.call(
                    this,
                    method,
                    url,
                    ...rest
                  );
                };

              true;
            })();
        `}
          javaScriptEnabled
          domStorageEnabled
          onMessage={(event) => {
            try {
              const webviewEvent = JSON.parse(event.nativeEvent.data) as YoutubeWebviewEvent;
              switch (webviewEvent.tag) {
                case 'watch':
                  setVideoId(webviewEvent.videoId);
                  break;
                case 'timedtext':
                  const body = JSON.parse(webviewEvent.body) as {
                    events?: YoutubeCaptionEvent[];
                  };

                  body.events?.map((evnt) => console.log(evnt));

                  if (!body.events) {
                    throw new Error('events not found in timedtext response');
                  }

                  const captions = normalizeYoutubeCaptions(body.events);
                  const videoId = webviewEvent.videoId;

                  setCaptions({ captions, videoId });
                  break;
                case 'reset':
                  setVideoId(undefined);
                  setCaptions(undefined);
                  break;
                case 'error':
                  throw new Error(webviewEvent.message);
              }
            } catch {
              // console.log("WebView raw message error:", e, event.nativeEvent.data);
            }
          }}
        />

        {videoId !== undefined && (
          <View
            className="absolute bottom-4 left-0 right-0 px-4"
            style={{
              paddingBottom: insets.bottom,
            }}>
            <View className="flex flex-col gap-2 rounded-md border border-primary bg-background p-4">
              <Text className="text-lg font-bold text-foreground">
                {captions?.videoId !== videoId ? 'Enable Captions to Watch' : 'Watch Now'}
              </Text>
              <Button
                label="Play"
                disabled={captions?.videoId !== videoId}
                onPress={() => {
                  if (captions == null) return;
                  router.push({
                    pathname: '/video-player',
                    params: {
                      sourceString: JSON.stringify({
                        type: 'youtube',
                        captions: JSON.stringify(captions),
                        videoId,
                      } satisfies YoutubeMediaSource),
                    },
                  });
                }}
              />
            </View>
          </View>
        )}
      </SafeAreaView>
    </>
  );
}
