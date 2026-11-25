#include "patient.h"
#include <stdio.h>
#include <string.h>

Patient create_patient(int id, const char *name, int age, const char *gender,
                       const char *blood_group, const char *phone) {
    Patient p;
    p.id = id;
    p.age = age;
    snprintf(p.name, MAX_NAME_LEN, "%s", name ? name : "");
    snprintf(p.gender, sizeof(p.gender), "%s", gender ? gender : "");
    snprintf(p.blood_group, MAX_BLOOD_LEN, "%s", blood_group ? blood_group : "");
    snprintf(p.phone, MAX_PHONE_LEN, "%s", phone ? phone : "");
    return p;
}

void print_patient(const Patient *p) {
    if (!p) return;
    printf("[PAT-%04d] %-20s | Age: %2d | %-6s | Blood: %-3s | Phone: %s\n",
           p->id, p->name, p->age, p->gender, p->blood_group, p->phone);
}
