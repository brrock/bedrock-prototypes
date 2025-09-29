# Compiler to use
CC = gcc

# Compiler flags
# -Wall: Enable all standard warning messages
# -Wextra: Enable extra warning messages
# -std=c99: Compile according to the C99 standard
# -D_DEFAULT_SOURCE: Define _DEFAULT_SOURCE to expose POSIX functions like usleep
CFLAGS = -Wall -Wextra -std=c99 -D_DEFAULT_SOURCE

# The name of the executable file
TARGET = tui # Assuming you renamed progress_bar to tui

# The source file
SRC = tui.c # Assuming you renamed progress_bar.c to tui.c

# Default target: builds the executable
all: $(TARGET)

$(TARGET): $(SRC)
	$(CC) $(CFLAGS) $(SRC) -o $(TARGET)

# Clean target: removes compiled files
clean:
	rm -f $(TARGET)