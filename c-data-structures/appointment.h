#ifndef APPOINTMENT_H
#define APPOINTMENT_H

typedef struct {
    int id;
    int patient_id;
    int doctor_id;
    char date[16];   /* YYYY-MM-DD for lexicographical sorting */
    char time[16];   /* HH:MM */
    char status[20]; /* Scheduled, Completed, Cancelled */
} Appointment;

Appointment create_appointment(int id, int patient_id, int doctor_id,
                               const char *date, const char *time, const char *status);
void print_appointment(const Appointment *a);

#endif /* APPOINTMENT_H */
