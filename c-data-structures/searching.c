#include "algorithms.h"
#include <string.h>

/* Linear search by patient name (O(n)) */
int linear_search_patient_by_name(const Patient arr[], int n, const char *name) {
    if (!arr || !name) return -1;
    for (int i = 0; i < n; i++) {
        if (strcmp(arr[i].name, name) == 0) {
            return i;
        }
    }
    return -1;
}

/* Binary search by patient ID on an ID-sorted array (O(log n)) */
int binary_search_patient_by_id(const Patient arr[], int n, int target_id) {
    if (!arr || n <= 0) return -1;
    int low = 0;
    int high = n - 1;

    while (low <= high) {
        int mid = low + (high - low) / 2;
        if (arr[mid].id == target_id) return mid;
        if (arr[mid].id < target_id) low = mid + 1;
        else high = mid - 1;
    }
    return -1;
}
