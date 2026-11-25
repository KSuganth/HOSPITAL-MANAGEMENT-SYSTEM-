CC = gcc
CFLAGS = -Wall -Wextra -std=c11 -O2
SRCS = main.c patient.c doctor.c appointment.c linked_list.c queue.c stack.c bst.c hash_table.c sorting.c searching.c
TARGET = medicare_ds

all: $(TARGET)

$(TARGET): $(SRCS)
	$(CC) $(CFLAGS) $(SRCS) -o $(TARGET)

clean:
	rm -f $(TARGET) $(TARGET).exe *.o
