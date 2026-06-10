import { useAppTheme } from "@/theme/theme-provider";
import { Stack } from "expo-router";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import { useVideoPlayerContext } from "../contexts/video-screen-context";
import getFile from "@/utils/file";
import { useFileDb } from "@/contexts/file-sqlite";

export function VideoLoaderToolbar() {
  const { colors } = useAppTheme();
  const { setVideoUri } = useVideoPlayerContext();
  const { insertVideo } = useFileDb();

  const uploadHelper = async (src: "file" | "photos") => {
    const file = await getFile({ src });
    if (file == undefined) {
      console.log("undefined file on upload");
      return;
    }

    try {
      const result = await insertVideo(file);
      console.log(result);
    } catch (e) {
      console.log("errored on insertion of file", e);
    }
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: "ライブラリ",
          headerLargeTitle: false,
          headerTitleStyle: {
            color: colors.foreground,
          },
          headerTransparent: false,
          headerStyle: {
            backgroundColor: colors.background,
          },
          headerSearchBarOptions: {
            placeholder: "Search...",
            hideWhenScrolling: false,
          },
        }}
      />

      <Stack.Toolbar placement="right">
        <Stack.Toolbar.Menu
          icon="plus"
        >
          <Stack.Toolbar.MenuAction
            icon="folder"
            onPress={() => uploadHelper("file")}
          >
            Files
          </Stack.Toolbar.MenuAction>
          <Stack.Toolbar.MenuAction
            icon="photo"
            onPress={() => uploadHelper("photos")}
          >
            Photos
          </Stack.Toolbar.MenuAction>
        </Stack.Toolbar.Menu>
      </Stack.Toolbar>
    </>
  );
}
