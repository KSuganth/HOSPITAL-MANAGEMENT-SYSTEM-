#ifndef ALGORITHMS_H
#define ALGORITHMS_H

#include "patient.h"
#include "appointment.h"

/* Sorting algorithms */
void sort_patients_by_name(Patient arr[], int n);
void sort_patients_by_id(Patient arr[], int n);
void sort_appointments_by_date(Appointment arr[], int n);

/* Searching algorithms */
int linear_search_patient_by_name(const Patient arr[], int n, const char *name);
int binary_search_patient_by_id(const Patient arr[], int n, int target_id);

#endif /* ALGORITHMS_H */
