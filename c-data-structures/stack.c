#include "stack.h"
#include <stdio.h>
#include <stdlib.h>

void stack_init(UndoStack *s) {
    if (!s) return;
    s->top = NULL;
    s->size = 0;
}

int stack_push(UndoStack *s, const char *action_type, int record_id) {
    if (!s) return 0;
    StackNode *node = (StackNode *)malloc(sizeof(StackNode));
    if (!node) return 0;
    snprintf(node->action.action_type, MAX_ACTION_LEN, "%s", action_type ? action_type : "");
    node->action.record_id = record_id;
    node->next = s->top;
    s->top = node;
    s->size++;
    return 1;
}

int stack_pop(UndoStack *s, UndoAction *out) {
    if (!s || !s->top) return 0;
    StackNode *temp = s->top;
    if (out) *out = temp->action;
    s->top = s->top->next;
    free(temp);
    s->size--;
    return 1;
}

void stack_free(UndoStack *s) {
    if (!s) return;
    StackNode *curr = s->top;
    while (curr) {
        StackNode *next = curr->next;
        free(curr);
        curr = next;
    }
    s->top = NULL;
    s->size = 0;
}
