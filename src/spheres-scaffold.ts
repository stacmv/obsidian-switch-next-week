/**
 * Default scaffold for the sub-sphere model file.
 *
 * Written by the "Create sub-sphere model file" command when the configured
 * model file does not yet exist. This is a NEUTRAL example taxonomy — sections,
 * spheres and sub-spheres with empty project lists — meant only to show the
 * format. Users replace it with their own areas of life and slot their projects
 * under the sub-spheres. On each run, switch-next-week auto-appends any project
 * prefixes it finds in the backlog / week files but not yet in the model under
 * the "## Не назначено" section, ready to be moved into the right sub-sphere.
 *
 * Format (see the switch-next-week library docs for the full grammar):
 *   Секция недели (visible plan heading)  →  Сфера (##)  →  Подсфера (### slug — Название)  →  Проект (bullets)
 */
export const SPHERES_SCAFFOLD = `# Сферы и подсферы

## Секции недели

- Работа = Работа
- Дело и Развитие = Дело, Развитие
- ЗОЖ и Люди = ЗОЖ, Люди
- Деньги и Дом = Деньги, Дом
- Досуг = Досуг

## Работа

### work-automation — Автоматизация работы

### work — Рабочие задачи

## Дело

### infra — Инфраструктура

### software — Свои программные проекты

### media — Свои медиа-проекты

## Развитие

### learning — Учёба

### public-speaking — Ораторское мастерство

## ЗОЖ

### gym — Физкультура

### food — Питание

## Люди

### family — Семья

### friends — Друзья

## Деньги

### budget — Бюджет и учёт

### savings — Сбережения

## Дом

### cozy — Уютный дом

### repair — Ремонт

## Не назначено

Инструмент добавляет сюда проекты, найденные в backlog / файлах недель, но не
описанные в подсферах выше. Перенесите каждый в нужную подсферу вручную — после
этого он перестанет попадать в «Не назначено».
`;
