#include "algorithms.h"
#include <stdlib.h>
#include <string.h>

/* Merge Sort helper for sorting patients alphabetically by name */
static void merge_patients(Patient arr[], int left, int mid, int right) {
    int n1 = mid - left + 1;
    int n2 = right - mid;

    Patient *L = (Patient *)malloc((size_t)n1 * sizeof(Patient));
    Patient *R = (Patient *)malloc((size_t)n2 * sizeof(Patient));
    if (!L || !R) {
        free(L);
        free(R);
        return;
    }

    for (int i = 0; i < n1; i++) L[i] = arr[left + i];
    for (int j = 0; j < n2; j++) R[j] = arr[mid + 1 + j];

    int i = 0, j = 0, k = left;
    while (i < n1 && j < n2) {
        if (strcmp(L[i].name, R[j].name) <= 0) {
            arr[k++] = L[i++];
        } else {
            arr[k++] = R[j++];
        }
    }
    while (i < n1) arr[k++] = L[i++];
    while (j < n2) arr[k++] = R[j++];

    free(L);
    free(R);
}

static void merge_sort_patients_rec(Patient arr[], int left, int right) {
    if (left < right) {
        int mid = left + (right - left) / 2;
        merge_sort_patients_rec(arr, left, mid);
        merge_sort_patients_rec(arr, mid + 1, right);
        merge_patients(arr, left, mid, right);
    }
}

void sort_patients_by_name(Patient arr[], int n) {
    if (!arr || n <= 1) return;
    merge_sort_patients_rec(arr, 0, n - 1);
}

/* Insertion sort by Patient ID (used before binary search) */
void sort_patients_by_id(Patient arr[], int n) {
    if (!arr || n <= 1) return;
    for (int i = 1; i < n; i++) {
        Patient key = arr[i];
        int j = i - 1;
        while (j >= 0 && arr[j].id > key.id) {
            arr[j + 1] = arr[j];
            j--;
        }
        arr[j + 1] = key;
    }
}

/* Selection sort appointments chronologically by date + time */
void sort_appointments_by_date(Appointment arr[], int n) {
    if (!arr || n <= 1) return;
    for (int i = 0; i < n - 1; i++) {
        int min_idx = i;
        for (int j = i + 1; j < n; j++) {
            int cmp = strcmp(arr[j].date, arr[min_idx].date);
            if (cmp < 0 || (cmp == 0 && strcmp(arr[j].time, arr[min_idx].time) < 0)) {
                min_idx = j;
            }
        }
        if (min_idx != i) {
            Appointment tmp = arr[i];
            arr[i] = arr[min_idx];
            arr[min_idx] = tmp;
        }
    }
}
