// App.tsx
import React, {useState, useEffect, useRef} from 'react';
import {StyleSheet, Text, View, Vibration, Alert} from 'react-native';
import {Subscription} from 'expo-modules-core';
import {Accelerometer, AccelerometerMeasurement} from 'expo-sensors';

export default function HomeScreen() {
    const [fallCount, setFallCount] = useState<number>(0);
    const [acceleration, setAcceleration] = useState<number>(0);
    const [highestAcceleration, setHighestAcceleration] = useState<number>(0);
    const subscription = useRef<Subscription | null>(null);
    const isFalling = useRef<boolean>(false);
    const fallStartTime = useRef<number | null>(null);
    const impactDetected = useRef<boolean>(false);
    const stabilizationStartTime = useRef<number | null>(null);

    // array to store recent acceleration values over the last 5 seconds
    const recentAccelerations = useRef<{time: number; value: number}[]>([]);

    useEffect(() => {
        // set accelerometer update interval
        Accelerometer.setUpdateInterval(10);

        const subscribe = async () => {
            try {
                const isAvailable = await Accelerometer.isAvailableAsync();
                if (!isAvailable) {
                    Alert.alert('Accelerometer Not Available', 'Your device does not support accelerometer data.');
                    return;
                }

                subscription.current = Accelerometer.addListener(handleAccelerometerData);
            } catch (error) {
                console.error('Error subscribing to accelerometer:', error);
                Alert.alert('Error', 'Failed to subscribe to accelerometer data.');
            }
        };

        subscribe();

        // clear old data every second to keep the recent accelerations within 5 seconds
        const intervalId = setInterval(() => {
            const now = Date.now();
            // filter out entries older than 5 seconds
            recentAccelerations.current = recentAccelerations.current.filter(entry => now - entry.time <= 5000);
            // update the highest acceleration of the last 5 seconds
            updateHighestAcceleration();
        }, 1000);

        return () => {
            subscription.current?.remove();
            subscription.current = null;
            clearInterval(intervalId);
        };
    }, []);

    const handleAccelerometerData = ({x, y, z}: AccelerometerMeasurement) => {
        try {
            const totalAcceleration = Math.sqrt(x * x + y * y + z * z);
            setAcceleration(totalAcceleration);

            // add the current acceleration and timestamp to the recent accelerations
            recentAccelerations.current.push({time: Date.now(), value: totalAcceleration});

            // PATTERN
            const freeFallThreshold = 2; 
            const impactLowerThreshold = 6;
            const impactUpperThreshold = 10; 
            const stabilizationThreshold = 2; 

            const now = Date.now();

            // detect free fall phase (acceleration < 2 m/s² for at least 2 seconds)


            // detect impact phase (acceleration between 6 and 10 m/s²)
            if (
                !impactDetected.current &&
                totalAcceleration >= impactLowerThreshold &&
                totalAcceleration <= impactUpperThreshold
            ) {
                impactDetected.current = true;
                console.log('Impact phase detected');
            }

            // detect stabilization phase (acceleration < 2 m/s² for at least 5 seconds after impact)
            if (impactDetected.current && totalAcceleration < stabilizationThreshold) {
                if (stabilizationStartTime.current === null) {
                    stabilizationStartTime.current = now;
                    // stabilization = 5 seconds
                } else if (now - stabilizationStartTime.current >= 5000) {
                    setFallCount(prevCount => prevCount + 1);
                    Vibration.vibrate();
                    console.log('Fall detected and counted');

                    resetFallDetection();
                }
            } else {
                stabilizationStartTime.current = null;
            }
        } catch (error) {
            console.error('Error processing accelerometer data:', error);
        }
    };

    const resetFallDetection = () => {
        isFalling.current = false;
        fallStartTime.current = null;
        impactDetected.current = false;
        stabilizationStartTime.current = null;
    };

    // calculate and update the highest acceleration for the last 5 seconds
    const updateHighestAcceleration = () => {
        const values = recentAccelerations.current.map(entry => entry.value);
        if (values.length > 0) {
            const max = Math.max(...values);
            setHighestAcceleration(max);
        } else {
            setHighestAcceleration(0);
        }
    };

    return (
        <View style={styles.container}>
            <Text style={styles.text}>Number of Falls Detected:</Text>
            <Text style={styles.count}>{fallCount}</Text>

        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
        justifyContent: 'center',
        padding: 20,
    },
    text: {
        fontSize: 24,
        textAlign: 'center',
        marginVertical: 10,
    },
    count: {
        fontSize: 36,
        textAlign: 'center',
        fontWeight: 'bold',
        marginBottom: 20,
    },
});
