#include "queue.h"
#include <stdio.h>
#include <stdlib.h>

void queue_init(AppointmentQueue *q) {
    if (!q) return;
    q->front = NULL;
    q->rear = NULL;
    q->size = 0;
}

int queue_enqueue(AppointmentQueue *q, Appointment a) {
    if (!q) return 0;
    QueueNode *node = (QueueNode *)malloc(sizeof(QueueNode));
    if (!node) return 0;
    node->data = a;
    node->next = NULL;

    if (q->rear) {
        q->rear->next = node;
    } else {
        q->front = node;
    }
    q->rear = node;
    q->size++;
    return 1;
}

int queue_dequeue(AppointmentQueue *q, Appointment *out) {
    if (!q || !q->front) return 0;
    QueueNode *temp = q->front;
    if (out) *out = temp->data;
    q->front = q->front->next;
    if (!q->front) q->rear = NULL;
    free(temp);
    q->size--;
    return 1;
}

void queue_display(const AppointmentQueue *q) {
    if (!q) return;
    printf("--- Appointment Queue (%d waiting) ---\n", q->size);
    QueueNode *curr = q->front;
    while (curr) {
        print_appointment(&curr->data);
        curr = curr->next;
    }
}

void queue_free(AppointmentQueue *q) {
    if (!q) return;
    QueueNode *curr = q->front;
    while (curr) {
        QueueNode *next = curr->next;
        free(curr);
        curr = next;
    }
    q->front = NULL;
    q->rear = NULL;
    q->size = 0;
}
