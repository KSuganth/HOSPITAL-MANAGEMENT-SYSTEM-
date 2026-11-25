#include "appointment.h"
#include <stdio.h>

Appointment create_appointment(int id, int patient_id, int doctor_id,
                               const char *date, const char *time, const char *status) {
    Appointment a;
    a.id = id;
    a.patient_id = patient_id;
    a.doctor_id = doctor_id;
    snprintf(a.date, sizeof(a.date), "%s", date ? date : "");
    snprintf(a.time, sizeof(a.time), "%s", time ? time : "");
    snprintf(a.status, sizeof(a.status), "%s", status ? status : "Scheduled");
    return a;
}

void print_appointment(const Appointment *a) {
    if (!a) return;
    printf("[APT-%04d] Patient: %d | Doctor: %d | %s %s | Status: %s\n",
           a->id, a->patient_id, a->doctor_id, a->date, a->time, a->status);
}
