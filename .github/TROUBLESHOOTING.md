# Troubleshooting

## Intro

The incident management steps I have in mind when being on-call and getting an alert are:

- Verify the issue
- Triage
- Communicate and scalate if needed
- Mitigate
- Troubleshoot
- Postmortem

As general troubleshooting or debugging technique:

- Do not make things worse (eg, don’t randomly change things you are not familiar with, know when changes are hard to roll back).
- Communicate with the team. Take notes as you go of what you see and what you changed. A chat medium like Slack is good since it also keeps a timeline (We want to have backup ways of communicating). Communicate intent and be specific (eg “going to restart the x database in y host”). Acknowledge other people’s messages. Make sure everybody knows who’s got controls so people don’t step on each other. Usually you want one person leading troubleshooting and doing the changes and other people supporting by checking things, communicating with Customer Support and other teams etc.
- Try to divide the problem space. Ideally by two but don’t need to start strictly in a systematic way if you have strong historical indicators of where the problems have been.
- Test what has worked before. (But if you have to fix the exact same issue more than once or twice then this would be a huge indicator of poor engineering practices).
- Do earlier the tests that are fast to do which also give relevant information.
- If quick and initial tests failed, then it’s often a good idea to pause, step back and restart debugging in a more systematic fashion, testing more basic assumptions and validating with other people your mental model of how things are supposed to work.
