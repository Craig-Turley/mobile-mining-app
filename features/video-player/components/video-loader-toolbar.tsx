import { useAppTheme } from '@/theme/theme-provider';
import { Stack } from 'expo-router';
import getFile from '@/utils/file';
import { insertVideo } from '@/db/features/files/files.services';

export function VideoLoaderToolbar() {
  const { colors } = useAppTheme();

  const uploadHelper = async (src: 'file' | 'photos') => {
    const file = await getFile({ src });
    if (file == undefined) {
      console.log('undefined file on upload');
      return;
    }

    try {
      const result = await insertVideo(file);
      console.log(result);
    } catch (e) {
      console.log('errored on insertion of file', e);
      alert('There was an error saving your video. Please check permissions and try again');
    }
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Library',
          headerLargeTitle: false,
          headerTitleStyle: {
            color: colors.foreground,
          },
          headerTransparent: false,
          headerStyle: {
            backgroundColor: colors.background,
          },
          // headerSearchBarOptions: {
          //   placeholder: 'Search...',
          //   hideWhenScrolling: false,
          // },
        }}
      />

      <Stack.Toolbar placement="right">
        <Stack.Toolbar.Menu icon="plus">
          <Stack.Toolbar.MenuAction icon="folder" onPress={() => uploadHelper('file')}>
            Files
          </Stack.Toolbar.MenuAction>
          <Stack.Toolbar.MenuAction icon="photo" onPress={() => uploadHelper('photos')}>
            Photos
          </Stack.Toolbar.MenuAction>
        </Stack.Toolbar.Menu>
      </Stack.Toolbar>
    </>
  );
}
