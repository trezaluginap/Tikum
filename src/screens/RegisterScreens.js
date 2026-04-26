import AsyncStorage from '@react-native-async-storage/async-storage';
import { useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

const VEHICLE_TYPES = ['Motor', 'Mobil'];

export default function RegisterScreens({ onRegistered }) {
	const [nama, setNama] = useState('');
	const [jenisKendaraan, setJenisKendaraan] = useState('');
	const [isSubmitting, setIsSubmitting] = useState(false);

	const isDisabled = useMemo(() => {
		return !nama.trim() || !jenisKendaraan || isSubmitting;
	}, [nama, jenisKendaraan, isSubmitting]);

	const handleContinue = async () => {
		if (isDisabled) return;

		const payload = {
			display_name: nama.trim(),
			vehicle_type: jenisKendaraan,
		};

		try {
			setIsSubmitting(true);

			await AsyncStorage.setItem('guest_registration', JSON.stringify(payload));

			Alert.alert('Sukses', 'Registrasi berhasil disimpan secara lokal.');
			setNama('');
			setJenisKendaraan('');
			onRegistered?.();
		} catch (error) {
			Alert.alert('Error', error?.message || 'Gagal melakukan registrasi.');
			console.error('Register error:', error);
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<View style={styles.container}>
			<Text style={styles.title}>Guest Registration</Text>

			<View style={styles.section}>
				<Text style={styles.label}>Nama</Text>
				<TextInput
					value={nama}
					onChangeText={setNama}
					placeholder="Masukkan nama"
					maxLength={15}
					style={styles.input}
					autoCapitalize="words"
				/>
				<Text style={styles.helper}>{nama.length}/15 karakter</Text>
			</View>

			<View style={styles.section}>
				<Text style={styles.label}>Jenis Kendaraan</Text>
				<View style={styles.vehicleContainer}>
					{VEHICLE_TYPES.map((item) => {
						const selected = jenisKendaraan === item;
						return (
							<Pressable
								key={item}
								style={[styles.vehicleButton, selected && styles.vehicleButtonSelected]}
								onPress={() => setJenisKendaraan(item)}
							>
								<Text
									style={[styles.vehicleText, selected && styles.vehicleTextSelected]}
								>
									{item}
								</Text>
							</Pressable>
						);
					})}
				</View>
			</View>

			<Pressable
				onPress={handleContinue}
				disabled={isDisabled}
				style={[styles.continueButton, isDisabled && styles.continueButtonDisabled]}
			>
				<Text style={styles.continueButtonText}>
					{isSubmitting ? 'Menyimpan...' : 'Lanjut'}
				</Text>
			</Pressable>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		padding: 16,
		justifyContent: 'center',
		backgroundColor: '#fff',
	},
	title: {
		fontSize: 24,
		fontWeight: '700',
		marginBottom: 20,
	},
	section: {
		marginBottom: 16,
	},
	label: {
		fontSize: 16,
		fontWeight: '600',
		marginBottom: 8,
	},
	input: {
		borderWidth: 1,
		borderColor: '#d9d9d9',
		borderRadius: 10,
		paddingHorizontal: 12,
		paddingVertical: 10,
		fontSize: 16,
	},
	helper: {
		marginTop: 6,
		fontSize: 12,
		color: '#666',
	},
	vehicleContainer: {
		flexDirection: 'row',
		gap: 10,
	},
	vehicleButton: {
		borderWidth: 1,
		borderColor: '#d9d9d9',
		borderRadius: 10,
		paddingVertical: 10,
		paddingHorizontal: 16,
	},
	vehicleButtonSelected: {
		borderColor: '#222',
		backgroundColor: '#f2f2f2',
	},
	vehicleText: {
		fontSize: 14,
		color: '#333',
		fontWeight: '500',
	},
	vehicleTextSelected: {
		color: '#000',
		fontWeight: '700',
	},
	continueButton: {
		marginTop: 10,
		backgroundColor: '#111',
		borderRadius: 10,
		paddingVertical: 13,
		alignItems: 'center',
	},
	continueButtonDisabled: {
		backgroundColor: '#a0a0a0',
	},
	continueButtonText: {
		color: '#fff',
		fontSize: 16,
		fontWeight: '700',
	},
});
