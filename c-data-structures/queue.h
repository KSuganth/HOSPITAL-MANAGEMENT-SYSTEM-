#ifndef QUEUE_H
#define QUEUE_H

#include "appointment.h"

typedef struct QueueNode {
    Appointment data;
    struct QueueNode *next;
} QueueNode;

typedef struct {
    QueueNode *front;
    QueueNode *rear;
    int size;
} AppointmentQueue;

void queue_init(AppointmentQueue *q);
int queue_enqueue(AppointmentQueue *q, Appointment a);
int queue_dequeue(AppointmentQueue *q, Appointment *out);
void queue_display(const AppointmentQueue *q);
void queue_free(AppointmentQueue *q);

#endif /* QUEUE_H */
