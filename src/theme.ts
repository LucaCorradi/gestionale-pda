import { createTheme } from '@mantine/core'

export const mantineTheme = createTheme({
    primaryColor: 'cdf-blue',
    primaryShade: 9,
    colors: {
        'cdf-blue': ["#ebf9ff", "#d6f0fb", "#a8dff8", "#79cff7", "#59c1f5", "#49b8f5", "#40b4f6", "#349edb", "#268cc5", "#003349"],
    },
    // components: {
    //     Card: Card.extend({
    //         defaultProps: {
    //             bg: "background-black.8",
    //             withBorder: true,
    //         },
    //         styles: (theme) => ({
    //             root: {
    //                 borderColor: theme.colors['background-black'][6]
    //             }
    //         })
    //     }),
    //     Text: Text.extend({
    //         styles: () => ({
    //             root: {
    //                 whiteSpace: 'pre-line'
    //             }
    //         })
    //     }),
    // }
})