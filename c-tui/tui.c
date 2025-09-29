#include <stdio.h>
#include <unistd.h> 
#include <stdlib.h> 

#define GREEN_TEXT "\033[0;32m" 
#define BLUE_BG    "\033[44m"   
#define RESET_COLOR "\033[0m"   

#define BAR_CHAR '='

int main() {
    int i;
    int bar_length = 50; 

    printf("Starting awesome task...\n");

    for (i = 0; i <= 100; i++) {

        int filled_length = (int)(((double)i / 100.0) * bar_length);

        printf("\r");

        printf("[");

        printf("%s%s", BLUE_BG, GREEN_TEXT);
        for (int j = 0; j < filled_length; j++) {
            printf("%c", BAR_CHAR);
        }
        printf("%s", RESET_COLOR); 

        for (int j = filled_length; j < bar_length; j++) {
            printf(" ");
        }

        printf("] %3d%%", i);

        fflush(stdout);

        usleep(10000);
    }

    printf("\nTask completed!\n"); 

    return 0;
}