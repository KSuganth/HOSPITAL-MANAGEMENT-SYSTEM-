#ifndef LINKED_LIST_H
#define LINKED_LIST_H

#include "patient.h"

typedef struct PatientNode {
    Patient data;
    struct PatientNode *next;
} PatientNode;

typedef struct {
    PatientNode *head;
    int count;
} PatientList;

void list_init(PatientList *list);
int list_insert(PatientList *list, Patient p);
int list_delete_by_id(PatientList *list, int patient_id);
Patient *list_find_by_id(const PatientList *list, int patient_id);
void list_traverse(const PatientList *list);
void list_free(PatientList *list);

#endif /* LINKED_LIST_H */
