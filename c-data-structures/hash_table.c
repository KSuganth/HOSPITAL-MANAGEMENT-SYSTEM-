#include "hash_table.h"
#include <stdlib.h>

static unsigned int hash_id(int id) {
    return (unsigned int)(id < 0 ? -id : id) % HASH_TABLE_SIZE;
}

void ht_init(PatientHashTable *ht) {
    if (!ht) return;
    for (int i = 0; i < HASH_TABLE_SIZE; i++) {
        ht->buckets[i] = NULL;
    }
}

int ht_insert(PatientHashTable *ht, Patient p) {
    if (!ht) return 0;
    unsigned int idx = hash_id(p.id);
    HashEntry *curr = ht->buckets[idx];
    while (curr) {
        if (curr->key == p.id) {
            curr->value = p;
            return 1;
        }
        curr = curr->next;
    }
    HashEntry *entry = (HashEntry *)malloc(sizeof(HashEntry));
    if (!entry) return 0;
    entry->key = p.id;
    entry->value = p;
    entry->next = ht->buckets[idx];
    ht->buckets[idx] = entry;
    return 1;
}

Patient *ht_lookup(const PatientHashTable *ht, int patient_id) {
    if (!ht) return NULL;
    unsigned int idx = hash_id(patient_id);
    HashEntry *curr = ht->buckets[idx];
    while (curr) {
        if (curr->key == patient_id) return &curr->value;
        curr = curr->next;
    }
    return NULL;
}

int ht_delete(PatientHashTable *ht, int patient_id) {
    if (!ht) return 0;
    unsigned int idx = hash_id(patient_id);
    HashEntry *curr = ht->buckets[idx];
    HashEntry *prev = NULL;
    while (curr) {
        if (curr->key == patient_id) {
            if (prev) prev->next = curr->next;
            else ht->buckets[idx] = curr->next;
            free(curr);
            return 1;
        }
        prev = curr;
        curr = curr->next;
    }
    return 0;
}

void ht_free(PatientHashTable *ht) {
    if (!ht) return;
    for (int i = 0; i < HASH_TABLE_SIZE; i++) {
        HashEntry *curr = ht->buckets[i];
        while (curr) {
            HashEntry *next = curr->next;
            free(curr);
            curr = next;
        }
        ht->buckets[i] = NULL;
    }
}
