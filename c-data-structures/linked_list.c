#include "linked_list.h"
#include <stdio.h>
#include <stdlib.h>

void list_init(PatientList *list) {
    if (!list) return;
    list->head = NULL;
    list->count = 0;
}

int list_insert(PatientList *list, Patient p) {
    if (!list) return 0;
    PatientNode *node = (PatientNode *)malloc(sizeof(PatientNode));
    if (!node) return 0;
    node->data = p;
    node->next = list->head;
    list->head = node;
    list->count++;
    return 1;
}

int list_delete_by_id(PatientList *list, int patient_id) {
    if (!list || !list->head) return 0;
    PatientNode *curr = list->head;
    PatientNode *prev = NULL;

    while (curr) {
        if (curr->data.id == patient_id) {
            if (prev) prev->next = curr->next;
            else list->head = curr->next;
            free(curr);
            list->count--;
            return 1;
        }
        prev = curr;
        curr = curr->next;
    }
    return 0;
}

Patient *list_find_by_id(const PatientList *list, int patient_id) {
    if (!list) return NULL;
    PatientNode *curr = list->head;
    while (curr) {
        if (curr->data.id == patient_id) return &curr->data;
        curr = curr->next;
    }
    return NULL;
}

void list_traverse(const PatientList *list) {
    if (!list) return;
    printf("--- Patient Linked List (%d records) ---\n", list->count);
    PatientNode *curr = list->head;
    while (curr) {
        print_patient(&curr->data);
        curr = curr->next;
    }
}

void list_free(PatientList *list) {
    if (!list) return;
    PatientNode *curr = list->head;
    while (curr) {
        PatientNode *next = curr->next;
        free(curr);
        curr = next;
    }
    list->head = NULL;
    list->count = 0;
}
