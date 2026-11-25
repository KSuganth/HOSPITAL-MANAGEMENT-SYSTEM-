#ifndef STACK_H
#define STACK_H

#define MAX_ACTION_LEN 64

typedef struct {
    char action_type[MAX_ACTION_LEN]; /* e.g., "ADD_PATIENT", "BOOK_APPT" */
    int record_id;
} UndoAction;

typedef struct StackNode {
    UndoAction action;
    struct StackNode *next;
} StackNode;

typedef struct {
    StackNode *top;
    int size;
} UndoStack;

void stack_init(UndoStack *s);
int stack_push(UndoStack *s, const char *action_type, int record_id);
int stack_pop(UndoStack *s, UndoAction *out);
void stack_free(UndoStack *s);

#endif /* STACK_H */
