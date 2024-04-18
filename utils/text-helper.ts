import { addHours, addMinutes, format, isBefore, parseISO, startOfDay } from 'date-fns'

export function fullTextQuery (string: string): string {
  // const isStringAllNumbers = (str: string) => {
  //   return /^\d+$/.test(str)
  // }

  // if (isStringAllNumbers(string)) {
  //   return parseInt(string, 10)
  // }

  const searchSplit = string.split(' ')

  const keywordArray: any[] = []
  searchSplit.forEach(item => {
    if (item !== '') keywordArray.push(`'${item}'`)
  })
  const searchQuery = keywordArray.join(' & ')

  return searchQuery
}

export function generateReferenceCode () {
  let result = ''
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  const charactersLength = characters.length
  let counter = 0
  while (counter < 8) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength))
    counter += 1
  }
  return result
}
export function generateRandomNumber (length: number) {
  let result = ''
  const characters = '0123456789'
  const charactersLength = characters.length
  let counter = 0
  while (counter < length) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength))
    counter += 1
  }
  return result
}

export function generateTimeArray(everyHour: boolean) {
  // Create an empty array to store the time strings
  const timeArray = [];

  // Define the start time as 1 AM
  let currentTime = parseISO("1970-01-01T01:00:00");

  // Define the time interval in minutes (15 minutes)
  const interval = 15;

  // Define the end time as the start of the next day at 1 AM
  const endTime = addMinutes(startOfDay(currentTime), 24 * 60);

  // Iterate through the times from 1 AM to 1 AM the next day in 15-minute intervals
  while (isBefore(currentTime, endTime)) {
      // Format the current time as a string (e.g., "1:00 AM")
      const timeString = format(currentTime, everyHour ? 'h a':'h:mm a');

      // Add the formatted time string to the array
      timeArray.push(timeString);

      // Add the interval to the current time to get the next time

      if (everyHour) {
        currentTime = addHours(currentTime, 1);
      } else {
        currentTime = addMinutes(currentTime, interval);
      }
  }

  // Return the array of time strings
  return timeArray;
}
