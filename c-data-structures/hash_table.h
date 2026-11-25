#ifndef HASH_TABLE_H
#define HASH_TABLE_H

#include "patient.h"

#define HASH_TABLE_SIZE 31

typedef struct HashEntry {
    int key;
    Patient value;
    struct HashEntry *next;
} HashEntry;

typedef struct {
    HashEntry *buckets[HASH_TABLE_SIZE];
} PatientHashTable;

void ht_init(PatientHashTable *ht);
int ht_insert(PatientHashTable *ht, Patient p);
Patient *ht_lookup(const PatientHashTable *ht, int patient_id);
int ht_delete(PatientHashTable *ht, int patient_id);
void ht_free(PatientHashTable *ht);

#endif /* HASH_TABLE_H */
